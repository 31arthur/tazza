import type { Article } from '../../entities/Article';
import type { Asset } from '../../entities/Asset';
import type { Edition } from '../../entities/Edition';
import {
  syncKey,
  type RemoteChange,
  type SyncBase,
  type SyncReport,
  type SyncState,
} from '../../entities/Sync';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { AssetRepository } from '../../ports/repositories/AssetRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { SyncStateRepository } from '../../ports/repositories/SyncStateRepository';
import type { SyncRemote } from '../../ports/services/SyncRemote';
import { mergeArticle, mergeAsset, mergeEdition, sameData } from '../../services/syncMerge';

const MAX_ROUNDS = 4;

type Bases = Record<string, SyncBase>;

interface Local {
  articles: Map<string, Article>;
  editions: Map<string, Edition>;
  assets: Map<string, Asset>;
}

/**
 * Brings this computer and the shared server level: first it takes in what others changed
 * (combining it with local changes, part by part), then it sends what is new here. If someone
 * else sends first, it starts over, so nothing is overwritten without being combined.
 */
export class SyncNow {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
    private readonly assets: AssetRepository,
    private readonly state: SyncStateRepository,
    private readonly remote: SyncRemote,
  ) {}

  async execute(): Promise<SyncReport> {
    let state = await this.state.loadState();
    let pulled = 0;
    let pushed = 0;
    const conflicts = new Set<string>();

    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const incoming = await this.remote.pull(state.cursor);
      const bases: Bases = { ...state.bases };
      const local = await this.loadLocal();
      for (const change of incoming.changes) {
        pulled += 1;
        await this.takeIn(change, bases, local, conflicts);
      }
      state = { cursor: incoming.cursor, bases };
      await this.state.saveState(state);

      const sent = await this.sendOut(state, await this.loadLocal());
      pushed += sent.pushed;
      state = sent.state;
      await this.state.saveState(state);
      if (!sent.retry) break;
    }
    return { pulled, pushed, conflicts: [...conflicts] };
  }

  private async loadLocal(): Promise<Local> {
    const [articles, editions, assets] = await Promise.all([
      this.articles.listAll(),
      this.editions.list(),
      this.assets.list(),
    ]);
    return {
      articles: new Map(articles.map((a) => [a.id, a])),
      editions: new Map(editions.map((e) => [e.id, e])),
      assets: new Map(assets.map((a) => [a.id, a])),
    };
  }

  /** Applies one change from the server to local storage. */
  private async takeIn(change: RemoteChange, bases: Bases, local: Local, conflicts: Set<string>) {
    const key = syncKey(change.kind, change.id);
    const base = bases[key];
    const baseDoc = base && base.doc !== null ? base.doc : undefined;
    const note = (fields: readonly string[]) => {
      if (fields.length > 0) conflicts.add(`${key} (${fields.join(', ')})`);
    };

    if (change.deleted) {
      const mine = this.localDoc(change, local);
      // Deleted elsewhere: follow, unless it was changed here since (then it is sent back).
      if (mine !== undefined && baseDoc !== undefined && sameData(mine, baseDoc)) {
        if (change.kind === 'article') await this.articles.delete(change.id);
        if (change.kind === 'asset') await this.assets.delete(change.id);
      }
      bases[key] = { rev: change.rev, doc: null };
      return;
    }

    const theirs = change.doc;
    const mine = this.localDoc(change, local);
    bases[key] = { rev: change.rev, doc: theirs };

    if (change.kind === 'article') {
      const remote = theirs as Article;
      if (!mine) return void (await this.articles.save(remote));
      const result = mergeArticle(baseDoc as Article | undefined, mine as Article, remote);
      note(result.conflicts);
      if (!sameData(result.merged, mine)) await this.articles.save(result.merged);
    } else if (change.kind === 'edition') {
      const remote = theirs as Edition;
      if (!mine) return void (await this.editions.save(remote));
      const result = mergeEdition(baseDoc as Edition | undefined, mine as Edition, remote);
      note(result.conflicts);
      if (!sameData(result.merged, mine)) await this.editions.save(result.merged);
    } else {
      const remote = theirs as Asset;
      if (!mine) {
        const blob = await this.remote.getAsset(change.id);
        if (blob) await this.assets.put(remote, blob);
        return;
      }
      const result = mergeAsset(baseDoc as Asset | undefined, mine as Asset, remote);
      if (!sameData(result.merged, mine)) await this.assets.updateMeta(change.id, result.merged);
    }
  }

  private localDoc({ kind, id }: RemoteChange, local: Local): Article | Edition | Asset | undefined {
    return (kind === 'article' ? local.articles : kind === 'edition' ? local.editions : local.assets).get(id);
  }

  /** Sends what is new or changed here. `retry` is true when the server moved on meanwhile. */
  private async sendOut(state: SyncState, local: Local) {
    const bases: Bases = { ...state.bases };
    let pushed = 0;
    let retry = false;

    const send = async (kind: 'article' | 'edition' | 'asset', id: string, doc: unknown) => {
      const key = syncKey(kind, id);
      const base = bases[key];
      if (base && base.doc !== null && sameData(doc, base.doc)) return;
      if (kind === 'asset' && (!base || base.doc === null)) {
        const blob = await this.assets.getBlob(id);
        if (!blob) return;
        await this.remote.putAsset(id, blob);
      }
      const result = await this.remote.push({ kind, id, ifRev: base?.rev ?? 0, deleted: false, doc });
      if (result.ok) {
        bases[key] = { rev: result.rev, doc };
        pushed += 1;
      } else {
        retry = true;
      }
    };

    for (const a of local.articles.values()) await send('article', a.id, a);
    for (const e of local.editions.values()) await send('edition', e.id, e);
    for (const a of local.assets.values()) await send('asset', a.id, a);

    // Deleted here since the last sync: tell the server.
    for (const [key, base] of Object.entries(state.bases)) {
      if (base.doc === null) continue;
      const [kind, ...rest] = key.split(':');
      const id = rest.join(':');
      const stillHere =
        kind === 'article' ? local.articles.has(id) : kind === 'asset' ? local.assets.has(id) : true;
      if (stillHere || (kind !== 'article' && kind !== 'asset')) continue;
      const result = await this.remote.push({ kind, id, ifRev: base.rev, deleted: true });
      if (result.ok) {
        bases[key] = { rev: result.rev, doc: null };
        pushed += 1;
      } else {
        retry = true;
      }
    }
    return { state: { cursor: state.cursor, bases } satisfies SyncState, pushed, retry };
  }
}

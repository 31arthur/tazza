import type { Article } from '../entities/Article';
import type { Asset } from '../entities/Asset';
import type { Edition, Page } from '../entities/Edition';
import { MAX_VERSIONS, type ArticleNote, type ArticleVersion } from '../entities/Workflow';

/**
 * Combining two computers' changes to the same document. Each merge is "three-way": it knows
 * the copy both sides started from (the base), so it can tell who changed what. A part changed
 * on one side only is taken from that side; changed on both, the winner is named per document.
 */

const stable = (value: unknown): string =>
  JSON.stringify(value, (_key, v: unknown) =>
    v !== null && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );

/** True when two values hold the same data, whatever the order of their fields. */
export const sameData = (a: unknown, b: unknown): boolean => stable(a) === stable(b);

export interface MergeResult<T> {
  readonly merged: T;
  /** The parts changed on both sides in different ways. */
  readonly conflicts: readonly string[];
}

type Obj = Record<string, unknown>;

/** Picks one value for a part: unchanged sides yield to the changed one. */
const pick = (
  base: unknown,
  hasBase: boolean,
  local: unknown,
  remote: unknown,
  localWins: boolean,
): { value: unknown; conflict: boolean } => {
  if (sameData(local, remote)) return { value: local, conflict: false };
  if (hasBase && sameData(local, base)) return { value: remote, conflict: false };
  if (hasBase && sameData(remote, base)) return { value: local, conflict: false };
  return { value: localWins ? local : remote, conflict: hasBase };
};

const mergeKeys = (
  base: Obj | undefined,
  local: Obj,
  remote: Obj,
  localWins: boolean,
  skip: ReadonlySet<string> = new Set(),
): { out: Obj; conflicts: string[] } => {
  const out: Obj = {};
  const conflicts: string[] = [];
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  for (const key of keys) {
    if (skip.has(key)) continue;
    const { value, conflict } = pick(base?.[key], base !== undefined, local[key], remote[key], localWins);
    if (value !== undefined) out[key] = value;
    if (conflict) conflicts.push(key);
  }
  return { out, conflicts };
};

const unionById = <T extends { id: string }>(a: readonly T[] = [], b: readonly T[] = []): T[] => {
  const byId = new Map<string, T>();
  for (const item of [...a, ...b]) byId.set(item.id, byId.get(item.id) ?? item);
  return [...byId.values()];
};

/** A comment resolved on either computer stays resolved. */
const mergeNotes = (a: readonly ArticleNote[] | undefined, b: readonly ArticleNote[] | undefined) => {
  const byId = new Map<string, ArticleNote>();
  for (const n of [...(a ?? []), ...(b ?? [])]) {
    const seen = byId.get(n.id);
    byId.set(n.id, seen ? { ...seen, resolved: seen.resolved || n.resolved } : n);
  }
  return [...byId.values()].sort((x, y) => x.at - y.at);
};

const mergeVersions = (a: readonly ArticleVersion[] | undefined, b: readonly ArticleVersion[] | undefined) =>
  unionById(a, b)
    .sort((x, y) => x.at - y.at)
    .slice(-MAX_VERSIONS);

/**
 * Field by field; the story edited most recently wins a field changed on both sides. Comments
 * and saved versions are never lost: both sides' are kept.
 */
export function mergeArticle(
  base: Article | undefined,
  local: Article,
  remote: Article,
): MergeResult<Article> {
  const localWins = local.updatedAt >= remote.updatedAt;
  const { out, conflicts } = mergeKeys(
    base as Obj | undefined,
    local as unknown as Obj,
    remote as unknown as Obj,
    localWins,
    new Set(['notes', 'versions', 'updatedAt']),
  );
  const notes = mergeNotes(local.notes, remote.notes);
  const versions = mergeVersions(local.versions, remote.versions);
  const merged = {
    ...out,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    ...(notes.length > 0 && { notes }),
    ...(versions.length > 0 && { versions }),
  } as unknown as Article;
  return { merged, conflicts };
}

/**
 * Page by page, so two people laying out different pages never disturb each other. A page
 * changed on both sides is a conflict and this computer's version is kept.
 */
export function mergeEdition(
  base: Edition | undefined,
  local: Edition,
  remote: Edition,
): MergeResult<Edition> {
  const byNumber = (e: Edition | undefined) => new Map((e?.pages ?? []).map((p) => [p.number, p]));
  const [b, l, r] = [byNumber(base), byNumber(local), byNumber(remote)];
  const numbers = [...new Set([...b.keys(), ...l.keys(), ...r.keys()])].sort((x, y) => x - y);
  const pages: Page[] = [];
  const conflicts: string[] = [];

  for (const n of numbers) {
    const [bp, lp, rp] = [b.get(n), l.get(n), r.get(n)];
    if (lp && rp) {
      const { value, conflict } = pick(bp, base !== undefined && bp !== undefined, lp, rp, true);
      pages.push(value as Page);
      if (conflict) conflicts.push(`page ${n}`);
    } else if (lp || rp) {
      const present = (lp ?? rp) as Page;
      // The side that still has the page keeps it unless the other side deleted it from the
      // very copy they both started with; a page changed since then is kept.
      if (bp && sameData(bp, present)) continue;
      pages.push(present);
      if (bp) conflicts.push(`page ${n}`);
    }
  }

  const { out, conflicts: other } = mergeKeys(
    base as unknown as Obj | undefined,
    local as unknown as Obj,
    remote as unknown as Obj,
    true,
    new Set(['pages']),
  );
  return {
    merged: { ...out, pages } as unknown as Edition,
    conflicts: [...conflicts, ...other],
  };
}

/** Photo details: the picture never changes, so only name, credit, caption and tags merge. */
export function mergeAsset(base: Asset | undefined, local: Asset, remote: Asset): MergeResult<Asset> {
  const { out, conflicts } = mergeKeys(
    base as Obj | undefined,
    local as unknown as Obj,
    remote as unknown as Obj,
    true,
  );
  return { merged: out as unknown as Asset, conflicts };
}

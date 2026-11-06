// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { HttpSyncRemote } from '../src/data/services/HttpSyncRemote';
import type { Article } from '../src/domain/entities/Article';
import { DEFAULT_SYNC_SETTINGS } from '../src/domain/entities/Sync';
import { makeLeaf } from '../src/domain/layout/tree';
import {
  InMemoryArticleRepository,
  InMemoryAssetRepository,
  InMemoryEditionRepository,
  InMemorySyncState,
} from '../src/domain/testing/fakes';
import { SyncNow } from '../src/domain/usecases/sync/SyncNow';
import { createSyncServer } from './syncServer';

let server: Server;
let dir: string;
let url: string;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'tazza-sync-'));
  server = createSyncServer({ dataDir: dir, token: 'secret' });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  rmSync(dir, { recursive: true, force: true });
});

/** One computer: its own storage, talking to the shared server. */
const computer = (token = 'secret') => {
  const articles = new InMemoryArticleRepository();
  const editions = new InMemoryEditionRepository();
  const assets = new InMemoryAssetRepository();
  const state = new InMemorySyncState();
  const remote = new HttpSyncRemote(() => ({ ...DEFAULT_SYNC_SETTINGS, enabled: true, serverUrl: url, token }));
  return { articles, editions, assets, remote, sync: new SyncNow(articles, editions, assets, state, remote) };
};

const story = (id: string, extra: Partial<Article> = {}): Article => ({
  id,
  editionId: 'e1',
  headline: `Story ${id}`,
  subHeadline: '',
  byline: '',
  body: [],
  createdAt: 1,
  updatedAt: 10,
  ...extra,
});

describe('sync server', () => {
  it('refuses a wrong token and accepts the right one', async () => {
    await expect(computer('nope').remote.ping()).rejects.toThrow('token');
    await expect(computer().remote.ping()).resolves.toBeUndefined();
  });
});

describe('two computers working on one edition', () => {
  it('shares stories, the edition and photos, then follows edits and deletions', async () => {
    const [a, b] = [computer(), computer()];

    await a.assets.put({ id: 'p1', mimeType: 'image/png', widthPx: 2, heightPx: 2, byteSize: 3, name: 'one.png' }, new Blob(['abc'], { type: 'image/png' }));
    await a.articles.save(story('s1'));
    await a.editions.save({ id: 'e1', pages: [{ number: 1, layout: makeLeaf('t', 'lead', 's1') }] });
    expect((await a.sync.execute()).pushed).toBe(3);

    const first = await b.sync.execute();
    expect(first.pulled).toBe(3);
    expect((await b.articles.getById('s1')).headline).toBe('Story s1');
    expect((await b.editions.find('e1'))?.pages).toHaveLength(1);
    expect(await (await b.assets.getBlob('p1'))?.text()).toBe('abc');

    // Nothing changed: a second run does nothing.
    expect(await b.sync.execute()).toMatchObject({ pulled: 0, pushed: 0 });

    // B edits the story, A adds a page: both survive.
    await b.articles.save({ ...(await b.articles.getById('s1')), byline: 'By B', updatedAt: 20 });
    await a.editions.save({
      id: 'e1',
      pages: [{ number: 1, layout: makeLeaf('t', 'lead', 's1') }, { number: 2, layout: makeLeaf('u') }],
    });
    await b.sync.execute();
    const report = await a.sync.execute();
    await b.sync.execute();
    expect(report.conflicts).toEqual([]);
    expect((await a.articles.getById('s1')).byline).toBe('By B');
    expect((await b.editions.find('e1'))?.pages).toHaveLength(2);

    // A deletes the story; B follows.
    await a.articles.delete('s1');
    await a.sync.execute();
    await b.sync.execute();
    await expect(b.articles.getById('s1')).rejects.toThrow();
  });

  it('combines edits to different parts of one story and different pages made at the same time', async () => {
    const [a, b] = [computer(), computer()];
    await a.articles.save(story('s2'));
    await a.editions.save({ id: 'e2', pages: [{ number: 1, layout: makeLeaf('x') }, { number: 2, layout: makeLeaf('y') }] });
    await a.sync.execute();
    await b.sync.execute();

    // Both work offline, then sync one after the other.
    await a.articles.save({ ...(await a.articles.getById('s2')), headline: 'A headline', updatedAt: 30 });
    await a.editions.save({ id: 'e2', pages: [{ number: 1, layout: makeLeaf('x-a') }, { number: 2, layout: makeLeaf('y') }] });
    await b.articles.save({ ...(await b.articles.getById('s2')), byline: 'B byline', updatedAt: 40 });
    await b.editions.save({ id: 'e2', pages: [{ number: 1, layout: makeLeaf('x') }, { number: 2, layout: makeLeaf('y-b') }] });

    await a.sync.execute();
    const bReport = await b.sync.execute();
    await a.sync.execute();

    expect(bReport.conflicts).toEqual([]);
    for (const c of [a, b]) {
      const story2 = await c.articles.getById('s2');
      expect([story2.headline, story2.byline]).toEqual(['A headline', 'B byline']);
      const ids = (await c.editions.find('e2'))?.pages.map((p) => (p.layout as { id: string }).id);
      expect(ids).toEqual(['x-a', 'y-b']);
    }
  });

  it('keeps this computer\'s page and reports it when both changed the same page', async () => {
    const [a, b] = [computer(), computer()];
    await a.editions.save({ id: 'e3', pages: [{ number: 1, layout: makeLeaf('p') }] });
    await a.sync.execute();
    await b.sync.execute();
    await a.editions.save({ id: 'e3', pages: [{ number: 1, layout: makeLeaf('p-a') }] });
    await b.editions.save({ id: 'e3', pages: [{ number: 1, layout: makeLeaf('p-b') }] });
    await a.sync.execute();
    const report = await b.sync.execute();
    expect(report.conflicts.join()).toContain('edition:e3');
    expect((await b.editions.find('e3'))?.pages[0]?.layout).toMatchObject({ id: 'p-b' });
    await a.sync.execute();
    expect((await a.editions.find('e3'))?.pages[0]?.layout).toMatchObject({ id: 'p-b' });
  });
});

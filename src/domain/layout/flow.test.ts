import type { Article, ArticleBody } from '../entities/Article';
import { LayoutError } from '../errors/DomainError';
import {
  FixedClock,
  InMemoryArticleRepository,
  InMemoryEditionRepository,
  SequentialIds,
} from '../testing/fakes';
import { DeleteArticle } from '../usecases/article/DeleteArticle';
import { GetOrCreateEdition } from '../usecases/edition/GetOrCreateEdition';
import { AddPage } from '../usecases/layout/AddPage';
import { ClearSlot } from '../usecases/layout/ClearSlot';
import { ContinueStory } from '../usecases/layout/ContinueStory';
import { PlaceArticle } from '../usecases/layout/PlaceArticle';
import { RemoveSlot } from '../usecases/layout/RemoveSlot';
import { UnlinkContinuation } from '../usecases/layout/UnlinkContinuation';
import { inlineText } from '../entities/Article';
import { flowSlices, splitBody, splitInlines } from './flow';
import { leavesOf, makeLeaf, mapLeaves } from './tree';

const EDITION = '2026-11-11';

const words = (n: number, tag: string) =>
  Array.from({ length: n }, (_, i) => `${tag}${i}`).join(' ');

const longBody = (): ArticleBody => [
  { type: 'paragraph', children: [{ text: words(400, 'a') }] },
  { type: 'image', assetId: 'photo', caption: '' },
  { type: 'paragraph', children: [{ text: words(400, 'b') }] },
  { type: 'paragraph', children: [{ text: words(400, 'c') }] },
  { type: 'paragraph', children: [{ text: words(400, 'd') }] },
];

const plain = (body: ArticleBody): string =>
  body
    .flatMap((n) =>
      n.type === 'paragraph' || n.type === 'subhead' || n.type === 'pullquote'
        ? [inlineText(n.children)]
        : n.type === 'list'
          ? n.items.map(inlineText)
          : [],
    )
    .join(' ');

const story = (id: string): Article => ({
  id,
  editionId: EDITION,
  headline: `Story ${id}`,
  subHeadline: 'Deck',
  byline: '',
  body: longBody(),
  createdAt: 1,
  updatedAt: 1,
});

describe('splitting text', () => {
  it('splits runs at an offset and keeps the marks on both sides', () => {
    const [before, after] = splitInlines(
      [{ text: 'plain ' }, { text: 'bold words here', marks: ['bold'] }],
      10,
    );
    expect(before.map((r) => r.text).join('|')).toBe('plain |bold');
    expect(after.map((r) => r.text).join('|')).toBe('words here');
    expect(before[1]?.marks).toEqual(['bold']);
    expect(after[0]?.marks).toEqual(['bold']);
  });

  it('keeps every word when a body is poured into tiles, hero photo first', () => {
    const body = longBody();
    const parts = splitBody(body, [120, 120, 400], 'story');
    expect(parts).toHaveLength(3);
    expect(parts[0]?.[0]?.type).toBe('image'); // the hero stays with the first tile
    const rejoined = parts.map(plain).join(' ').split(/\s+/).filter(Boolean);
    expect(rejoined).toEqual(plain(body).split(/\s+/).filter(Boolean));
    expect(plain(parts[0] ?? []).length).toBeGreaterThan(0);
    expect(plain(parts[2] ?? []).length).toBeGreaterThan(0);
  });

  it('puts everything in the first tile when there is room', () => {
    const parts = splitBody([{ type: 'paragraph', children: [{ text: 'short text' }] }], [500, 500], 'story');
    expect(plain(parts[0] ?? [])).toBe('short text');
    expect(parts[1]).toEqual([]);
  });
});

describe('continued stories', () => {
  const setup = async () => {
    const articles = new InMemoryArticleRepository();
    const editions = new InMemoryEditionRepository();
    const ids = new SequentialIds();
    await new GetOrCreateEdition(editions, ids).execute({ editionId: EDITION });
    await articles.save(story('1'));
    await articles.save(story('2'));
    const addPage = new AddPage(editions, ids);
    await addPage.execute({ editionId: EDITION });
    const lookup = async (id: string) => articles.getById(id);
    return {
      articles,
      editions,
      ids,
      lookup,
      place: new PlaceArticle(articles, editions, ids),
      cont: new ContinueStory(articles, editions, ids),
      unlink: new UnlinkContinuation(articles, editions, ids),
      edition: async () => (await editions.find(EDITION)) ?? { id: EDITION, pages: [] },
      sliceMap: async () => {
        const edition = (await editions.find(EDITION)) ?? { id: EDITION, pages: [] };
        const all = new Map((await articles.listByEdition(EDITION)).map((a) => [a.id, a]));
        return { edition, slices: flowSlices(edition, (id) => all.get(id)) };
      },
    };
  };

  const tileOf = (edition: { pages: readonly { layout: Parameters<typeof leavesOf>[0] }[] }, article: string) =>
    edition.pages.flatMap((p) => leavesOf(p.layout)).filter((l) => l.articleId === article);

  it('continues a story on another page and divides the text between the tiles', async () => {
    const s = await setup();
    await s.place.execute({ editionId: EDITION, pageNumber: 1, articleId: '1' });
    const [src] = tileOf(await s.edition(), '1');
    await s.cont.execute({
      editionId: EDITION,
      pageNumber: 1,
      leafId: src?.id ?? '',
      toPageNumber: 2,
    });

    const { edition, slices } = await s.sliceMap();
    const tiles = tileOf(edition, '1');
    expect(tiles).toHaveLength(2);
    const [a, b] = tiles;
    expect(a?.continuesTo).toBe(b?.id);
    expect(b?.continuesFrom).toBe(a?.id);

    const first = slices.get(a?.id ?? '');
    const second = slices.get(b?.id ?? '');
    expect(first).toMatchObject({ first: true, last: false, continuedToPage: 2 });
    expect(second).toMatchObject({ first: false, last: true, continuedFromPage: 1 });
    expect(first?.continuedFromPage).toBeUndefined();

    const original = plain(story('1').body).split(/\s+/);
    const shown = [first, second].map((x) => plain(x?.body ?? [])).join(' ').split(/\s+/).filter(Boolean);
    expect(shown).toEqual(original);
    expect(plain(second?.body ?? []).length).toBeGreaterThan(0);
  });

  it('can continue into an empty tile and on the same page', async () => {
    const s = await setup();
    await s.place.execute({ editionId: EDITION, pageNumber: 1, articleId: '1' });
    const [src] = tileOf(await s.edition(), '1');
    const empty = leavesOf((await s.edition()).pages[1]?.layout ?? makeLeaf('x')).find(
      (l) => l.articleId === undefined,
    );
    await s.cont.execute({
      editionId: EDITION,
      pageNumber: 1,
      leafId: src?.id ?? '',
      toPageNumber: 2,
      toLeafId: empty?.id ?? '',
    });
    const tiles = tileOf(await s.edition(), '1');
    expect(tiles.map((t) => t.id)).toContain(empty?.id);

    await s.place.execute({ editionId: EDITION, pageNumber: 1, articleId: '2' });
    const [other] = tileOf(await s.edition(), '2');
    await s.cont.execute({
      editionId: EDITION,
      pageNumber: 1,
      leafId: other?.id ?? '',
      toPageNumber: 1,
    });
    expect(tileOf(await s.edition(), '2')).toHaveLength(2);
  });

  it('refuses to continue a story twice, an empty tile, or into a full tile', async () => {
    const s = await setup();
    await s.place.execute({ editionId: EDITION, pageNumber: 1, articleId: '1' });
    await s.place.execute({ editionId: EDITION, pageNumber: 1, articleId: '2' });
    const [one] = tileOf(await s.edition(), '1');
    const [two] = tileOf(await s.edition(), '2');
    const input = { editionId: EDITION, pageNumber: 1, toPageNumber: 2 };

    await expect(s.cont.execute({ ...input, leafId: two?.id ?? '', toLeafId: one?.id ?? '' })).rejects.toBeInstanceOf(LayoutError);
    await s.cont.execute({ ...input, leafId: one?.id ?? '' });
    await expect(s.cont.execute({ ...input, leafId: one?.id ?? '' })).rejects.toBeInstanceOf(LayoutError);

    const emptyOnPage2 = leavesOf((await s.edition()).pages[1]?.layout ?? makeLeaf('x')).find(
      (l) => l.articleId === undefined,
    );
    await expect(s.cont.execute({ ...input, leafId: emptyOnPage2?.id ?? '' })).rejects.toBeInstanceOf(LayoutError);
  });

  it('unlinking removes the continuation tile and restores the full story in one tile', async () => {
    const s = await setup();
    await s.place.execute({ editionId: EDITION, pageNumber: 1, articleId: '1' });
    const [src] = tileOf(await s.edition(), '1');
    await s.cont.execute({ editionId: EDITION, pageNumber: 1, leafId: src?.id ?? '', toPageNumber: 2 });
    await s.unlink.execute({ editionId: EDITION, leafId: src?.id ?? '' });

    const { edition, slices } = await s.sliceMap();
    const tiles = tileOf(edition, '1');
    expect(tiles).toHaveLength(1);
    expect(tiles[0]?.continuesTo).toBeUndefined();
    expect(slices.size).toBe(0);
  });

  it('keeps a three-tile chain joined when the middle tile is removed or cleared', async () => {
    const s = await setup();
    await s.place.execute({ editionId: EDITION, pageNumber: 1, articleId: '1' });
    const [a] = tileOf(await s.edition(), '1');
    await s.cont.execute({ editionId: EDITION, pageNumber: 1, leafId: a?.id ?? '', toPageNumber: 2 });
    const [, b] = tileOf(await s.edition(), '1');
    await s.cont.execute({ editionId: EDITION, pageNumber: 2, leafId: b?.id ?? '', toPageNumber: 2 });
    expect(tileOf(await s.edition(), '1')).toHaveLength(3);

    await new RemoveSlot(s.articles, s.editions, s.ids).execute({
      editionId: EDITION,
      pageNumber: 2,
      leafId: b?.id ?? '',
    });
    const [first, last] = tileOf(await s.edition(), '1');
    expect(first?.continuesTo).toBe(last?.id);
    expect(last?.continuesFrom).toBe(first?.id);
    const { slices } = await s.sliceMap();
    expect(slices.get(first?.id ?? '')?.first).toBe(true);
    expect(slices.get(last?.id ?? '')?.last).toBe(true);

    // Clearing the last tile leaves the first with no continuation partner.
    await new ClearSlot(s.articles, s.editions).execute({
      editionId: EDITION,
      pageNumber: 2,
      leafId: last?.id ?? '',
    });
    const cleared = tileOf(await s.edition(), '1');
    expect(cleared).toHaveLength(1);
    expect(cleared[0]?.continuesTo).toBeUndefined();
  });

  it('draws a continuation as an orphan when its source now holds another story', async () => {
    const s = await setup();
    await s.place.execute({ editionId: EDITION, pageNumber: 1, articleId: '1' });
    const [src] = tileOf(await s.edition(), '1');
    await s.cont.execute({ editionId: EDITION, pageNumber: 1, leafId: src?.id ?? '', toPageNumber: 2 });
    const edition = await s.edition();

    // The source tile is handed a different story, as if swapped, without clearing its links.
    const broken = {
      ...edition,
      pages: edition.pages.map((p) => ({
        ...p,
        layout: mapLeaves(p.layout, (l) => (l.id === src?.id ? { ...l, articleId: '2' } : l)),
      })),
    };
    const all = new Map((await s.articles.listByEdition(EDITION)).map((a) => [a.id, a]));
    const slices = flowSlices(broken, (id) => all.get(id));
    expect([...slices.values()].some((x) => x.orphan)).toBe(true);
  });

  it('deleting a story also removes its continuation links', async () => {
    const s = await setup();
    await s.place.execute({ editionId: EDITION, pageNumber: 1, articleId: '1' });
    const [src] = tileOf(await s.edition(), '1');
    await s.cont.execute({ editionId: EDITION, pageNumber: 1, leafId: src?.id ?? '', toPageNumber: 2 });
    await new DeleteArticle(s.articles, s.editions).execute({ id: '1' });
    const leaves = (await s.edition()).pages.flatMap((p) => leavesOf(p.layout));
    expect(leaves.every((l) => l.continuesFrom === undefined && l.continuesTo === undefined)).toBe(true);
    void new FixedClock();
  });
});

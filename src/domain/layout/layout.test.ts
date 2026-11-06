import type { Article } from '../entities/Article';
import { placedArticleIds } from '../entities/Edition';
import { LayoutError } from '../errors/DomainError';
import { InMemoryArticleRepository, InMemoryEditionRepository, SequentialIds } from '../testing/fakes';
import { liveRectMm } from '../services/PageGeometry';
import { DropArticle } from '../usecases/layout/DropArticle';
import { AutoLayout } from '../usecases/layout/AutoLayout';
import { ApplyTemplate } from '../usecases/layout/ApplyTemplate';
import { GetOrCreateEdition } from '../usecases/edition/GetOrCreateEdition';
import { PlaceArticle } from '../usecases/layout/PlaceArticle';
import { fitPage, needMm } from './fit';
import { buildTemplate, slotCount, TEMPLATE_IDS } from './templates';
import {
  articleIdsOf,
  insertBeside,
  layoutRects,
  leavesOf,
  makeLeaf,
  normalize,
  pruneEmpty,
  removeLeaf,
} from './tree';

const EDITION = '2026-11-06';

const story = (id: string, chars: number, images = 0): Article => ({
  id,
  editionId: EDITION,
  headline: `Story ${id}`,
  subHeadline: '',
  byline: '',
  body: [
    { type: 'paragraph', children: [{ text: 'వార్త '.repeat(Math.ceil(chars / 5)) }] },
    ...Array.from({ length: images }, () => ({ type: 'image' as const, assetId: 'a', caption: '' })),
  ],
  createdAt: Number(id.replace(/\D/g, '')) || 0,
  updatedAt: 0,
});

const setup = async (count: number, chars = 1200) => {
  const articles = new InMemoryArticleRepository();
  const editions = new InMemoryEditionRepository();
  const ids = new SequentialIds();
  for (let i = 1; i <= count; i++) await articles.save(story(String(i), chars + i * 50, i % 2));
  const edition = await new GetOrCreateEdition(editions, ids).execute({ editionId: EDITION });
  return { articles, editions, ids, edition };
};

describe('layout tree', () => {
  it('every template tiles the page: row columns add up and no tile is empty-sized', () => {
    for (const id of TEMPLATE_IDS) {
      const tree = buildTemplate(id, new SequentialIds());
      const { leaves } = layoutRects(tree, 1);
      expect(leaves).toHaveLength(slotCount(id));
      const live = liveRectMm(1);
      for (const { rect } of leaves) {
        expect(rect.w).toBeGreaterThan(0);
        expect(rect.h).toBeGreaterThan(0);
        expect(rect.x).toBeGreaterThanOrEqual(live.x - 0.01);
        expect(rect.x + rect.w).toBeLessThanOrEqual(live.x + live.w + 0.01);
        expect(rect.y + rect.h).toBeLessThanOrEqual(live.y + live.h + 0.01);
      }
    }
  });

  it('removing a tile collapses its split and hands its columns to a neighbour', () => {
    const ids = new SequentialIds();
    const tree = buildTemplate('inner-4', ids);
    const brief = leavesOf(tree).find((l) => l.role === 'brief');
    expect(brief).toBeTruthy();
    const after = removeLeaf(tree, brief?.id ?? '');
    expect(after && leavesOf(after)).toHaveLength(3);
    const { leaves } = layoutRects(normalize(after ?? tree), 1);
    const bottomRow = leaves.filter((l) => l.leaf.role === 'story' && l.rect.y > 100);
    expect(bottomRow.reduce((n, l) => n + l.cols, 0)).toBe(6);
  });

  it('inserting beside a story in a full one-column row is rejected', () => {
    const ids = new SequentialIds();
    const row = {
      kind: 'split' as const,
      id: 'r',
      direction: 'row' as const,
      children: Array.from({ length: 6 }, (_, i) => makeLeaf(`l${i}`)),
      sizes: [1, 1, 1, 1, 1, 1],
    };
    expect(() => insertBeside(row, 'l2', makeLeaf('new'), 'right', ids)).toThrow(LayoutError);
  });

  it('prunes empty tiles', () => {
    const tree = buildTemplate('inner-2', new SequentialIds());
    expect(pruneEmpty(tree)).toBeUndefined();
  });
});

describe('fit engine', () => {
  it('shares columns so side-by-side stories end up about the same height', async () => {
    const { articles, edition } = await setup(0);
    await articles.save(story('1', 3000));
    await articles.save(story('2', 600));
    const lookup = (id: string) => (id === '1' ? story('1', 3000) : story('2', 600));
    const ids = new SequentialIds();
    const row = {
      kind: 'split' as const,
      id: 'r',
      direction: 'row' as const,
      children: [makeLeaf('a', 'story', '1'), makeLeaf('b', 'story', '2')],
      sizes: [3, 3],
    };
    const fitted = fitPage(row, 2, lookup);
    expect(fitted.kind === 'split' && fitted.sizes[0]).toBeGreaterThan(3); // long story gets more
    expect(edition.id).toBe(EDITION);
    expect(ids.next()).toBe('id-1');
  });

  it('needs more height when there is more text', () => {
    const lookup = (id: string) => story(id, id === 'x' ? 4000 : 400);
    expect(needMm(makeLeaf('a', 'story', 'x'), 3, lookup)).toBeGreaterThan(
      needMm(makeLeaf('b', 'story', 'y'), 3, lookup),
    );
  });
});

describe('layout use cases', () => {
  it('auto layout places every story exactly once and adds pages when needed', async () => {
    const s = await setup(14);
    const edition = await new AutoLayout(s.articles, s.editions, s.ids).execute({ editionId: EDITION });
    const placed = edition.pages.flatMap((p) => articleIdsOf(p.layout));
    expect(new Set(placed).size).toBe(14);
    expect(placed).toHaveLength(14);
    expect(edition.pages.length).toBeGreaterThan(1);
  });

  it('auto layout prunes empty slots so few stories still fill the page', async () => {
    const s = await setup(3);
    const edition = await new AutoLayout(s.articles, s.editions, s.ids).execute({ editionId: EDITION });
    const first = edition.pages[0];
    expect(first && leavesOf(first.layout).every((l) => l.articleId !== undefined)).toBe(true);
  });

  it('dropping on an edge splits the target; dropping in the middle swaps', async () => {
    const s = await setup(2);
    await new AutoLayout(s.articles, s.editions, s.ids).execute({ editionId: EDITION });
    const drop = new DropArticle(s.articles, s.editions, s.ids);
    const edition = (await s.editions.find(EDITION)) as NonNullable<Awaited<ReturnType<typeof s.editions.find>>>;
    const [a, b] = leavesOf(edition.pages[0]?.layout ?? makeLeaf('x'));
    expect(a?.articleId && b?.articleId).toBeTruthy();
    if (!a?.articleId || !b?.articleId) return;

    const swapped = await drop.execute({
      editionId: EDITION,
      pageNumber: 1,
      targetLeafId: b.id,
      zone: 'center',
      articleId: a.articleId,
      fromLeafId: a.id,
    });
    const [a2, b2] = leavesOf(swapped.pages[0]?.layout ?? makeLeaf('x'));
    expect(a2?.articleId).toBe(b.articleId);
    expect(b2?.articleId).toBe(a.articleId);

    // After the swap, tile `a` holds b's story and tile `b` holds a's story.
    const beside = await drop.execute({
      editionId: EDITION,
      pageNumber: 1,
      targetLeafId: b.id,
      zone: 'right',
      articleId: b.articleId,
      fromLeafId: a.id,
    });
    expect(articleIdsOf(beside.pages[0]?.layout ?? makeLeaf('x')).sort()).toEqual(
      [a.articleId, b.articleId].sort(),
    );
  });

  it('placing a story elsewhere moves it (a story lives in one place)', async () => {
    const s = await setup(1);
    const place = new PlaceArticle(s.articles, s.editions, s.ids);
    await place.execute({ editionId: EDITION, pageNumber: 1, articleId: '1' });
    const again = await place.execute({ editionId: EDITION, pageNumber: 1, articleId: '1' });
    expect([...placedArticleIds(again)]).toEqual(['1']);
  });

  it('applying a template keeps the stories and re-fits the page', async () => {
    const s = await setup(5);
    const before = await new AutoLayout(s.articles, s.editions, s.ids).execute({
      editionId: EDITION,
    });
    const onPageOne = articleIdsOf(before.pages[0]?.layout ?? makeLeaf('x'));
    expect(onPageOne.length).toBeGreaterThan(0);
    const edition = await new ApplyTemplate(s.articles, s.editions, s.ids).execute({
      editionId: EDITION,
      pageNumber: 1,
      templateId: 'inner-6',
    });
    expect(articleIdsOf(edition.pages[0]?.layout ?? makeLeaf('x')).sort()).toEqual(
      [...onPageOne].sort(),
    );
  });
});

import { InMemoryArticleRepository, InMemoryEditionRepository, SequentialIds } from '../testing/fakes';
import { GetOrCreateEdition } from '../usecases/edition/GetOrCreateEdition';
import { AddElement } from '../usecases/layout/AddElement';
import { ApplyTemplate } from '../usecases/layout/ApplyTemplate';
import { DropArticle } from '../usecases/layout/DropArticle';
import { UpdateElement } from '../usecases/layout/UpdateElement';
import { ELEMENT_KINDS, elementDefaults } from './element';
import { resolveStyle } from './style';
import { leavesOf, makeLeaf, swapContents, withElement, type Leaf } from './tree';

const EDITION = '2026-11-07';

const setup = async () => {
  const articles = new InMemoryArticleRepository();
  const editions = new InMemoryEditionRepository();
  const ids = new SequentialIds();
  await new GetOrCreateEdition(editions, ids).execute({ editionId: EDITION });
  return {
    articles,
    editions,
    ids,
    add: new AddElement(articles, editions, ids),
    update: new UpdateElement(articles, editions),
    drop: new DropArticle(articles, editions, ids),
    apply: new ApplyTemplate(articles, editions, ids),
  };
};

const tiles = async (s: Awaited<ReturnType<typeof setup>>): Promise<Leaf[]> =>
  leavesOf((await s.editions.find(EDITION))?.pages[0]?.layout ?? makeLeaf('x'));

describe('layout elements', () => {
  it('has sensible defaults for every kind', () => {
    for (const kind of ELEMENT_KINDS) {
      const d = elementDefaults(kind);
      expect(d.element.type).toBeTruthy();
    }
    // A sidebar is a boxed, tinted text box.
    const sidebar = elementDefaults('sidebar');
    expect(sidebar.element.type).toBe('text');
    expect(resolveStyle({ role: sidebar.role, style: sidebar.style })).toMatchObject({
      frame: 'box',
      tint: 'yellow',
    });
  });

  it('adds an element along the bottom of the page and keeps the page tiled', async () => {
    const s = await setup();
    const before = (await tiles(s)).length;
    const edition = await s.add.execute({ editionId: EDITION, pageNumber: 1, kind: 'label' });
    const after = leavesOf(edition.pages[0]?.layout ?? makeLeaf('x'));
    expect(after).toHaveLength(before + 1);
    expect(after.some((l) => l.element?.type === 'label')).toBe(true);
  });

  it('adds an element beside a tile when dropped on its edge', async () => {
    const s = await setup();
    const target = (await tiles(s))[0];
    const edition = await s.add.execute({
      editionId: EDITION,
      pageNumber: 1,
      kind: 'photo',
      targetLeafId: target?.id ?? '',
      zone: 'right',
    });
    expect(leavesOf(edition.pages[0]?.layout ?? makeLeaf('x')).some((l) => l.element)).toBe(true);
  });

  it('updates the content of an element tile', async () => {
    const s = await setup();
    const added = await s.add.execute({ editionId: EDITION, pageNumber: 1, kind: 'text' });
    const tile = leavesOf(added.pages[0]?.layout ?? makeLeaf('x')).find((l) => l.element);
    const updated = await s.update.execute({
      editionId: EDITION,
      pageNumber: 1,
      leafId: tile?.id ?? '',
      element: { type: 'text', heading: 'రేపు చర్చలు', body: 'Details' },
    });
    const changed = leavesOf(updated.pages[0]?.layout ?? makeLeaf('x')).find((l) => l.element);
    expect(changed?.element).toEqual({ type: 'text', heading: 'రేపు చర్చలు', body: 'Details' });
  });

  it('moves an element tile by dragging it to another tile', async () => {
    const s = await setup();
    const added = await s.add.execute({ editionId: EDITION, pageNumber: 1, kind: 'ad' });
    const ad = leavesOf(added.pages[0]?.layout ?? makeLeaf('x')).find((l) => l.element);
    const other = (await tiles(s)).find((l) => l.id !== ad?.id);
    const moved = await s.drop.execute({
      editionId: EDITION,
      pageNumber: 1,
      targetLeafId: other?.id ?? '',
      zone: 'left',
      fromLeafId: ad?.id ?? '',
    });
    const after = leavesOf(moved.pages[0]?.layout ?? makeLeaf('x'));
    expect(after.filter((l) => l.element?.type === 'ad')).toHaveLength(1);
    expect(after).toHaveLength((await tiles(s)).length);
  });

  it('swaps what two tiles hold without swapping their styles', () => {
    const a = withElement(makeLeaf('a', 'banner'), { type: 'label', text: 'A' });
    const b = makeLeaf('b', 'story', 'article-1');
    const tree = {
      kind: 'split' as const,
      id: 's',
      direction: 'column' as const,
      children: [a, b],
      sizes: [1, 1],
    };
    const swapped = leavesOf(swapContents(tree, 'a', 'b'));
    expect(swapped[0]).toMatchObject({ id: 'a', role: 'banner', articleId: 'article-1' });
    expect(swapped[0]?.element).toBeUndefined();
    expect(swapped[1]).toMatchObject({ id: 'b', role: 'story', element: { type: 'label' } });
  });

  it('keeps elements when a template is applied', async () => {
    const s = await setup();
    await s.add.execute({ editionId: EDITION, pageNumber: 1, kind: 'label' });
    const edition = await s.apply.execute({
      editionId: EDITION,
      pageNumber: 1,
      templateId: 'inner-6',
    });
    expect(
      leavesOf(edition.pages[0]?.layout ?? makeLeaf('x')).filter((l) => l.element?.type === 'label'),
    ).toHaveLength(1);
  });
});

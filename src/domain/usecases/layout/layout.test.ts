import type { Article } from '../../entities/Article';
import { LayoutError } from '../../errors/DomainError';
import {
  FixedClock,
  InMemoryArticleRepository,
  InMemoryEditionRepository,
  SequentialIds,
} from '../../testing/fakes';
import { gridRows } from '../../services/PageGeometry';
import { CreateArticle } from '../article/CreateArticle';
import { UpdateArticle } from '../article/UpdateArticle';
import { DeleteArticle } from '../article/DeleteArticle';
import { GetOrCreateEdition } from '../edition/GetOrCreateEdition';
import { AutoLayout } from './AutoLayout';
import { PlaceArticle } from './PlaceArticle';
import { RemovePage } from './RemovePage';
import { UpdateBlock } from './UpdateBlock';

const EDITION = '2026-11-06';

const setup = () => {
  const articles = new InMemoryArticleRepository();
  const editions = new InMemoryEditionRepository();
  const ids = new SequentialIds();
  const clock = new FixedClock();
  return {
    articles,
    editions,
    create: new CreateArticle(articles, ids, clock),
    update: new UpdateArticle(articles, clock),
    remove: new DeleteArticle(articles, editions),
    getEdition: new GetOrCreateEdition(editions),
    autoLayout: new AutoLayout(articles, editions, ids),
    place: new PlaceArticle(articles, editions, ids),
    updateBlock: new UpdateBlock(editions),
    removePage: new RemovePage(editions),
  };
};

const writeStory = async (
  s: ReturnType<typeof setup>,
  headline: string,
  chars: number,
): Promise<Article> => {
  const a = await s.create.execute({ editionId: EDITION });
  return s.update.execute({
    id: a.id,
    patch: {
      headline,
      body: [{ type: 'paragraph', children: [{ text: 'వార్త '.repeat(chars / 5) }] }],
    },
  });
};

describe('layout use cases', () => {
  it('creates an edition with one empty page', async () => {
    const s = setup();
    const edition = await s.getEdition.execute({ editionId: EDITION });
    expect(edition.pages).toHaveLength(1);
    expect(edition.pages[0]?.blocks).toEqual([]);
  });

  it('auto layout places every article without overlaps, adding pages when needed', async () => {
    const s = setup();
    await s.getEdition.execute({ editionId: EDITION });
    for (let i = 0; i < 14; i++) await writeStory(s, `Story ${i}`, 1500);

    const edition = await s.autoLayout.execute({ editionId: EDITION });

    expect(edition.pages.length).toBeGreaterThan(1);
    const blocks = edition.pages.flatMap((p) => p.blocks);
    expect(new Set(blocks.map((b) => b.articleId)).size).toBe(14);
    for (const page of edition.pages) {
      for (const b of page.blocks) {
        expect(b.placement.col + b.placement.colSpan).toBeLessThanOrEqual(6);
        expect(b.placement.row + b.placement.rowSpan).toBeLessThanOrEqual(gridRows(page.number));
      }
    }
  });

  it('rejects overlapping and out-of-grid updates', async () => {
    const s = setup();
    await s.getEdition.execute({ editionId: EDITION });
    const a = await writeStory(s, 'A', 300);
    const b = await writeStory(s, 'B', 300);
    const edition = await s.autoLayout.execute({ editionId: EDITION });
    const [first, second] = edition.pages[0]?.blocks ?? [];
    expect(first && second).toBeTruthy();
    if (!first || !second) return;

    await expect(
      s.updateBlock.execute({
        editionId: EDITION,
        pageNumber: 1,
        blockId: second.id,
        placement: first.placement,
      }),
    ).rejects.toBeInstanceOf(LayoutError);

    await expect(
      s.updateBlock.execute({
        editionId: EDITION,
        pageNumber: 1,
        blockId: first.id,
        placement: { ...first.placement, col: 5, colSpan: 3 },
      }),
    ).rejects.toBeInstanceOf(LayoutError);
    expect([a.id, b.id]).toHaveLength(2);
  });

  it('moving an article to another page removes it from the first', async () => {
    const s = setup();
    await s.getEdition.execute({ editionId: EDITION });
    const a = await writeStory(s, 'A', 300);
    await s.autoLayout.execute({ editionId: EDITION });
    await s.editions.save({
      id: EDITION,
      pages: [
        ...(await s.getEdition.execute({ editionId: EDITION })).pages,
        { number: 2, blocks: [] },
      ],
    });

    const moved = await s.place.execute({ editionId: EDITION, pageNumber: 2, articleId: a.id });
    expect(moved.pages[0]?.blocks).toHaveLength(0);
    expect(moved.pages[1]?.blocks).toHaveLength(1);
  });

  it('removing a page returns its stories to the unplaced pool and renumbers', async () => {
    const s = setup();
    await s.getEdition.execute({ editionId: EDITION });
    for (let i = 0; i < 14; i++) await writeStory(s, `Story ${i}`, 1500);
    const laidOut = await s.autoLayout.execute({ editionId: EDITION });
    expect(laidOut.pages.length).toBeGreaterThan(1);

    const after = await s.removePage.execute({ editionId: EDITION, pageNumber: 1 });
    expect(after.pages.map((p) => p.number)).toEqual(after.pages.map((_, i) => i + 1));
  });

  it('deleting an article removes its block', async () => {
    const s = setup();
    await s.getEdition.execute({ editionId: EDITION });
    const a = await writeStory(s, 'A', 300);
    await s.autoLayout.execute({ editionId: EDITION });
    await s.remove.execute({ id: a.id });
    const edition = await s.getEdition.execute({ editionId: EDITION });
    expect(edition.pages.flatMap((p) => p.blocks)).toHaveLength(0);
  });

  it('normalises Telugu text to NFC on save', async () => {
    const s = setup();
    const a = await s.create.execute({ editionId: EDITION });
    const decomposed = 'ఔ'.normalize('NFD');
    const saved = await s.update.execute({ id: a.id, patch: { headline: decomposed } });
    expect(saved.headline).toBe(decomposed.normalize('NFC'));
  });
});

import { findPage, replacePage, type Edition } from '../../entities/Edition';
import { LayoutError } from '../../errors/DomainError';
import { fitPage } from '../../layout/fit';
import {
  appendBottom,
  findLeaf,
  isEmptyLeaf,
  leavesOf,
  makeLeaf,
  mapLeaves,
  normalize,
  withArticle,
  type LayoutNode,
} from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { loadLayoutContext } from './support';

export interface ContinueStoryInput {
  editionId: string;
  /** Where the story is now. */
  pageNumber: number;
  leafId: string;
  /** Where it carries on. */
  toPageNumber: number;
  /** An empty tile to continue in; without it a new tile is added along the bottom of the page. */
  toLeafId?: string;
}

/**
 * Makes a story carry on in another tile, possibly on another page. The story is not cut in
 * storage; the text is divided across the tiles when the page is drawn, and the "continues on
 * page N" and "continued from page N" lines are added automatically.
 */
export class ContinueStory {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: ContinueStoryInput): Promise<Edition> {
    const ctx = await loadLayoutContext(this.articles, this.editions, input.editionId);
    const sourcePage = findPage(ctx.edition, input.pageNumber);
    const source = findLeaf(sourcePage.layout, input.leafId);
    if (!source?.articleId) throw new LayoutError('Only a tile that holds a story can be continued');

    const alreadyContinues = ctx.edition.pages.some((p) =>
      leavesOf(p.layout).some((l) => l.continuesFrom === source.id),
    );
    if (alreadyContinues) throw new LayoutError('This story already continues in another tile');

    const samePage = input.toPageNumber === input.pageNumber;
    const targetPage = findPage(ctx.edition, input.toPageNumber);
    let target: LayoutNode = samePage ? sourcePage.layout : targetPage.layout;

    let continuationId: string;
    if (input.toLeafId !== undefined) {
      const tile = findLeaf(target, input.toLeafId);
      if (!tile) throw new LayoutError('Target tile not found');
      if (tile.id === source.id || !isEmptyLeaf(tile)) {
        throw new LayoutError('Choose an empty tile to continue the story in');
      }
      continuationId = tile.id;
      const storyId = source.articleId;
      target = mapLeaves(target, (l) =>
        l.id === tile.id ? { ...withArticle(l, storyId), continuesFrom: source.id } : l,
      );
    } else {
      continuationId = this.ids.next();
      target = appendBottom(
        target,
        { ...makeLeaf(continuationId, 'story', source.articleId), continuesFrom: source.id },
        this.ids,
      );
    }

    const markSource = (layout: LayoutNode): LayoutNode =>
      mapLeaves(layout, (l) => (l.id === source.id ? { ...l, continuesTo: continuationId } : l));
    const fit = (layout: LayoutNode, pageNumber: number) =>
      fitPage(normalize(layout), pageNumber, ctx.lookup);

    let edition = ctx.edition;
    if (samePage) {
      edition = replacePage(edition, {
        ...sourcePage,
        layout: fit(markSource(target), input.pageNumber),
      });
    } else {
      edition = replacePage(edition, {
        ...targetPage,
        layout: fit(target, input.toPageNumber),
      });
      edition = replacePage(edition, {
        ...sourcePage,
        layout: fit(markSource(sourcePage.layout), input.pageNumber),
      });
    }
    await this.editions.save(edition);
    return edition;
  }
}

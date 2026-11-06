import { findPage, replacePage, withoutArticle, type Edition } from '../../entities/Edition';
import { LayoutError } from '../../errors/DomainError';
import { fitPage } from '../../layout/fit';
import {
  findLeaf,
  insertBeside,
  makeLeaf,
  normalize,
  removeLeaf,
  setLeafArticle,
  swapContents,
  type Edge,
} from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { loadLayoutContext } from './support';

export type DropZone = Edge | 'center';

export interface DropArticleInput {
  editionId: string;
  pageNumber: number;
  /** The tile the story was dropped on. */
  targetLeafId: string;
  zone: DropZone;
  /** The story being dropped (omit when moving an element tile). */
  articleId?: string;
  /** Set when an already-placed tile on this page is being moved. */
  fromLeafId?: string;
}

/**
 * Drops a story, or moves a tile, onto another tile. Dropping in the middle fills or swaps;
 * dropping on an edge splits the target's space to make room beside it. Either way the whole
 * page is re-fitted. A moved tile keeps its role and style.
 */
export class DropArticle {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: DropArticleInput): Promise<Edition> {
    const { editionId, pageNumber, targetLeafId, zone, articleId, fromLeafId } = input;
    const ctx = await loadLayoutContext(this.articles, this.editions, editionId);
    if (!fromLeafId && !articleId) throw new LayoutError('Nothing to drop');
    if (articleId && !ctx.lookup(articleId)) throw new LayoutError('Story not found');

    // A story lives in one place only: lift it out of wherever it was (except a tile we move).
    let edition = fromLeafId || !articleId ? ctx.edition : withoutArticle(ctx.edition, articleId);
    const page = findPage(edition, pageNumber);
    let tree = page.layout;

    if (!findLeaf(tree, targetLeafId)) throw new LayoutError('Drop target not found');
    if (fromLeafId === targetLeafId) return ctx.edition; // dropped on itself: nothing to do

    const source = fromLeafId ? findLeaf(tree, fromLeafId) : undefined;
    if (fromLeafId) {
      if (!source || (articleId && source.articleId !== articleId)) {
        throw new LayoutError('The page changed while dragging; try again');
      }
    }

    if (zone === 'center') {
      tree = fromLeafId
        ? swapContents(tree, fromLeafId, targetLeafId)
        : setLeafArticle(tree, targetLeafId, articleId);
    } else {
      if (fromLeafId) {
        const without = removeLeaf(tree, fromLeafId);
        if (!without) throw new LayoutError('Cannot move the only tile on the page');
        tree = without;
      }
      const moved = source
        ? { ...source, id: this.ids.next() }
        : makeLeaf(this.ids.next(), 'story', articleId);
      tree = insertBeside(tree, targetLeafId, moved, zone, this.ids);
    }

    edition = replacePage(edition, {
      number: pageNumber,
      layout: fitPage(normalize(tree), pageNumber, ctx.lookup),
    });
    await this.editions.save(edition);
    return edition;
  }
}

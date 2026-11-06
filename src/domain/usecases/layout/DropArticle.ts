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
  swapArticles,
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
  articleId: string;
  /** Set when an already-placed tile on this page is being moved. */
  fromLeafId?: string;
}

/**
 * Drops a story onto a tile. Dropping in the middle fills or swaps the tile; dropping on an
 * edge splits the tile's space to make room beside it. Either way the whole page is re-fitted.
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
    if (!ctx.lookup(articleId)) throw new LayoutError('Story not found');

    // A story lives in one place only: lift it out of wherever it was (except a tile we move).
    let edition = fromLeafId ? ctx.edition : withoutArticle(ctx.edition, articleId);
    const page = findPage(edition, pageNumber);
    let tree = page.layout;

    if (!findLeaf(tree, targetLeafId)) throw new LayoutError('Drop target not found');
    if (fromLeafId === targetLeafId) return ctx.edition; // dropped on itself: nothing to do
    if (fromLeafId && findLeaf(tree, fromLeafId)?.articleId !== articleId) {
      throw new LayoutError('The page changed while dragging; try again');
    }

    if (zone === 'center') {
      tree = fromLeafId
        ? swapArticles(tree, fromLeafId, targetLeafId)
        : setLeafArticle(tree, targetLeafId, articleId);
    } else {
      const source = fromLeafId ? findLeaf(tree, fromLeafId) : undefined;
      if (fromLeafId) {
        const without = removeLeaf(tree, fromLeafId);
        if (!without) throw new LayoutError('Cannot move the only story on the page');
        tree = without;
      }
      tree = insertBeside(
        tree,
        targetLeafId,
        makeLeaf(this.ids.next(), source?.role ?? 'story', articleId),
        zone,
        this.ids,
      );
    }

    edition = replacePage(edition, {
      number: pageNumber,
      layout: fitPage(normalize(tree), pageNumber, ctx.lookup),
    });
    await this.editions.save(edition);
    return edition;
  }
}

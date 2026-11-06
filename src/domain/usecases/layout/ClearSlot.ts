import { findLeafInEdition, findPage, replacePage, type Edition } from '../../entities/Edition';
import { bridgeOver } from '../../layout/continuation';
import { fitPage } from '../../layout/fit';
import { normalize, setLeafArticle } from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import { loadLayoutContext, type PageRef } from './support';

/**
 * Takes the story out of a tile, leaving the tile empty. A tile in the middle of a continued
 * story leaves the chain, and the tiles around it are joined up.
 */
export class ClearSlot {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
  ) {}

  async execute(ref: PageRef & { leafId: string }): Promise<Edition> {
    const ctx = await loadLayoutContext(this.articles, this.editions, ref.editionId);
    const found = findLeafInEdition(ctx.edition, ref.leafId);
    const edition = found ? bridgeOver(ctx.edition, found.leaf) : ctx.edition;

    const page = findPage(edition, ref.pageNumber);
    const layout = setLeafArticle(page.layout, ref.leafId, undefined);
    const updated = replacePage(edition, {
      ...page,
      layout: fitPage(normalize(layout), ref.pageNumber, ctx.lookup),
    });
    await this.editions.save(updated);
    return updated;
  }
}

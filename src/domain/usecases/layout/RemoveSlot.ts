import { findLeafInEdition, findPage, replacePage, type Edition } from '../../entities/Edition';
import { bridgeOver } from '../../layout/continuation';
import { fitPage } from '../../layout/fit';
import { makeLeaf, normalize, removeLeaf } from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { loadLayoutContext, type PageRef } from './support';

/**
 * Deletes the tile itself; its neighbours grow into the space. If it was part of a continued
 * story, the rest of that chain is joined up around it.
 */
export class RemoveSlot {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(ref: PageRef & { leafId: string }): Promise<Edition> {
    const ctx = await loadLayoutContext(this.articles, this.editions, ref.editionId);
    const found = findLeafInEdition(ctx.edition, ref.leafId);
    const edition = found ? bridgeOver(ctx.edition, found.leaf) : ctx.edition;

    const page = findPage(edition, ref.pageNumber);
    const layout = removeLeaf(page.layout, ref.leafId) ?? makeLeaf(this.ids.next());
    const updated = replacePage(edition, {
      ...page,
      layout: fitPage(normalize(layout), ref.pageNumber, ctx.lookup),
    });
    await this.editions.save(updated);
    return updated;
  }
}

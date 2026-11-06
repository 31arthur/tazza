import { findPage, replacePage, withoutArticle, type Edition } from '../../entities/Edition';
import { LayoutError } from '../../errors/DomainError';
import { fitPage } from '../../layout/fit';
import {
  appendBottom,
  emptyLeavesByPriority,
  makeLeaf,
  normalize,
  setLeafArticle,
} from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { loadLayoutContext } from './support';

/** Puts a story on a page: into its best empty slot, or as a new tile along the bottom. */
export class PlaceArticle {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute({
    editionId,
    pageNumber,
    articleId,
  }: {
    editionId: string;
    pageNumber: number;
    articleId: string;
  }): Promise<Edition> {
    const ctx = await loadLayoutContext(this.articles, this.editions, editionId);
    if (!ctx.lookup(articleId)) throw new LayoutError('Story not found');

    const edition = withoutArticle(ctx.edition, articleId);
    const page = findPage(edition, pageNumber);
    const slot = emptyLeavesByPriority(page.layout)[0];
    const layout = slot
      ? setLeafArticle(page.layout, slot.id, articleId)
      : appendBottom(page.layout, makeLeaf(this.ids.next(), 'story', articleId), this.ids);

    const updated = replacePage(edition, {
      number: pageNumber,
      layout: fitPage(normalize(layout), pageNumber, ctx.lookup),
    });
    await this.editions.save(updated);
    return updated;
  }
}

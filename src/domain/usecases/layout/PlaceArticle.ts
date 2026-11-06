import {
  findFreeSpot,
  findPage,
  replacePage,
  withoutArticle,
  type Edition,
} from '../../entities/Edition';
import { LayoutError, NotFoundError } from '../../errors/DomainError';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { estimateBlockSize } from '../../services/CopyfitEstimator';

const MIN_ROWS = 3;

/** Places (or moves) an article onto a page in the first free spot that fits its estimated size. */
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
    const edition = await this.editions.find(editionId);
    if (!edition) throw new NotFoundError(`Edition ${editionId} not found`);
    const article = await this.articles.getById(articleId);

    const cleared = withoutArticle(edition, articleId);
    const page = findPage(cleared, pageNumber);
    const size = estimateBlockSize(article);

    // Prefer the estimated height; accept a shorter block (it may overflow) before giving up.
    for (let rows = size.rowSpan; rows >= MIN_ROWS; rows--) {
      const placement = findFreeSpot(page, size.colSpan, rows);
      if (placement) {
        const updated = replacePage(cleared, {
          ...page,
          blocks: [...page.blocks, { id: this.ids.next(), articleId, placement }],
        });
        await this.editions.save(updated);
        return updated;
      }
    }
    throw new LayoutError(`No free space for this story on page ${pageNumber}`);
  }
}

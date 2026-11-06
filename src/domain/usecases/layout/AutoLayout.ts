import { findFreeSpot, placedArticleIds, type Block, type Edition, type Page } from '../../entities/Edition';
import { NotFoundError } from '../../errors/DomainError';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { estimateBlockSize } from '../../services/CopyfitEstimator';
import { gridRows } from '../../services/PageGeometry';

/**
 * Flows every unplaced article onto the pages, first-fit in writing order,
 * adding pages as needed. Existing blocks are left where they are.
 */
export class AutoLayout {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute({ editionId }: { editionId: string }): Promise<Edition> {
    const edition = await this.editions.find(editionId);
    if (!edition) throw new NotFoundError(`Edition ${editionId} not found`);

    const placed = placedArticleIds(edition);
    const unplaced = (await this.articles.listByEdition(editionId))
      .filter((a) => !placed.has(a.id))
      .sort((a, b) => a.createdAt - b.createdAt);

    const pages: Page[] = edition.pages.map((p) => ({ ...p }));

    for (const article of unplaced) {
      const size = estimateBlockSize(article);
      let done = false;
      for (let i = 0; !done; i++) {
        let page = pages[i];
        if (!page) {
          page = { number: i + 1, blocks: [] };
          pages.push(page);
        }
        const rows = Math.min(size.rowSpan, gridRows(page.number));
        const placement = findFreeSpot(page, size.colSpan, rows);
        if (placement) {
          const block: Block = { id: this.ids.next(), articleId: article.id, placement };
          pages[i] = { ...page, blocks: [...page.blocks, block] };
          done = true;
        }
      }
    }

    const updated: Edition = { ...edition, pages };
    await this.editions.save(updated);
    return updated;
  }
}

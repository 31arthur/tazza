import type { Edition } from '../../entities/Edition';
import { LayoutError, NotFoundError } from '../../errors/DomainError';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';

/** Removes a page; its stories become unplaced again. */
export class RemovePage {
  constructor(private readonly editions: EditionRepository) {}

  async execute({
    editionId,
    pageNumber,
  }: {
    editionId: string;
    pageNumber: number;
  }): Promise<Edition> {
    const edition = await this.editions.find(editionId);
    if (!edition) throw new NotFoundError(`Edition ${editionId} not found`);
    if (edition.pages.length <= 1) throw new LayoutError('An edition needs at least one page');
    const updated: Edition = {
      ...edition,
      pages: edition.pages
        .filter((p) => p.number !== pageNumber)
        .map((p, index) => ({ ...p, number: index + 1 })),
    };
    await this.editions.save(updated);
    return updated;
  }
}

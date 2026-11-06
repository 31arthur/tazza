import type { Edition } from '../../entities/Edition';
import { NotFoundError } from '../../errors/DomainError';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';

export class AddPage {
  constructor(private readonly editions: EditionRepository) {}

  async execute({ editionId }: { editionId: string }): Promise<Edition> {
    const edition = await this.editions.find(editionId);
    if (!edition) throw new NotFoundError(`Edition ${editionId} not found`);
    const updated: Edition = {
      ...edition,
      pages: [...edition.pages, { number: edition.pages.length + 1, blocks: [] }],
    };
    await this.editions.save(updated);
    return updated;
  }
}

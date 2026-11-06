import { newEdition, type Edition } from '../../entities/Edition';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';

export class GetOrCreateEdition {
  constructor(private readonly editions: EditionRepository) {}

  async execute({ editionId }: { editionId: string }): Promise<Edition> {
    const existing = await this.editions.find(editionId);
    if (existing) return existing;
    const created = newEdition(editionId);
    await this.editions.save(created);
    return created;
  }
}

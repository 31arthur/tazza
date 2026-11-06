import { newEdition, type Edition } from '../../entities/Edition';
import { buildTemplate } from '../../layout/templates';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';

export class GetOrCreateEdition {
  constructor(
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute({ editionId }: { editionId: string }): Promise<Edition> {
    const existing = await this.editions.find(editionId);
    if (existing) return existing;
    const created = newEdition(editionId, buildTemplate('front', this.ids));
    await this.editions.save(created);
    return created;
  }
}

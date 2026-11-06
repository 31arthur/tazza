import { newEdition, type Edition } from '../../entities/Edition';
import { NotFoundError } from '../../errors/DomainError';
import { buildTemplate } from '../../layout/templates';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';

/** Back to a single empty front page; every story becomes unplaced. */
export class ClearLayout {
  constructor(
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute({ editionId }: { editionId: string }): Promise<Edition> {
    if (!(await this.editions.find(editionId))) {
      throw new NotFoundError(`Edition ${editionId} not found`);
    }
    const updated = newEdition(editionId, buildTemplate('front', this.ids));
    await this.editions.save(updated);
    return updated;
  }
}

import type { Edition } from '../../entities/Edition';
import { NotFoundError } from '../../errors/DomainError';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';

/** Puts an earlier snapshot of an edition back (undo/redo). The edition must already exist. */
export class RestoreEdition {
  constructor(private readonly editions: EditionRepository) {}

  async execute({ edition }: { edition: Edition }): Promise<Edition> {
    if (!(await this.editions.find(edition.id))) {
      throw new NotFoundError(`Edition ${edition.id} not found`);
    }
    await this.editions.save(edition);
    return edition;
  }
}

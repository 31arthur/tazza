import type { Edition } from '../../entities/Edition';
import { NotFoundError } from '../../errors/DomainError';
import type { Masthead } from '../../layout/style';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';

/** Edits the masthead of one edition (logo text, colour, ears, top strip, print marks). */
export class UpdateMasthead {
  constructor(private readonly editions: EditionRepository) {}

  async execute({
    editionId,
    masthead,
  }: {
    editionId: string;
    masthead: Partial<Masthead>;
  }): Promise<Edition> {
    const edition = await this.editions.find(editionId);
    if (!edition) throw new NotFoundError(`Edition ${editionId} not found`);
    const updated: Edition = { ...edition, masthead: { ...edition.masthead, ...masthead } };
    await this.editions.save(updated);
    return updated;
  }
}

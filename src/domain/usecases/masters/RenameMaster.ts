import type { Edition } from '../../entities/Edition';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import { mastersOf, requireEdition, requireMaster } from './support';

export class RenameMaster {
  constructor(private readonly editions: EditionRepository) {}

  async execute(input: { editionId: string; masterId: string; name: string }): Promise<Edition> {
    const edition = await requireEdition(this.editions, input.editionId);
    requireMaster(edition, input.masterId);
    const name = input.name.trim();
    if (name === '') return edition;
    const updated: Edition = {
      ...edition,
      masters: mastersOf(edition).map((m) => (m.id === input.masterId ? { ...m, name } : m)),
    };
    await this.editions.save(updated);
    return updated;
  }
}

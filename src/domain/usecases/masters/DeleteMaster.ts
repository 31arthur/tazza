import type { Edition } from '../../entities/Edition';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import { mastersOf, requireEdition, requireMaster } from './support';

/** Deletes a master; the pages that used it simply stop showing it. */
export class DeleteMaster {
  constructor(private readonly editions: EditionRepository) {}

  async execute(input: { editionId: string; masterId: string }): Promise<Edition> {
    const edition = await requireEdition(this.editions, input.editionId);
    requireMaster(edition, input.masterId);
    const updated: Edition = {
      ...edition,
      masters: mastersOf(edition).filter((m) => m.id !== input.masterId),
      pages: edition.pages.map((p) => {
        if (p.masterId !== input.masterId) return p;
        const { masterId: _gone, ...rest } = p;
        return rest;
      }),
    };
    await this.editions.save(updated);
    return updated;
  }
}

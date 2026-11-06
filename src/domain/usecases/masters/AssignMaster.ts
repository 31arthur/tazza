import { findPage, type Edition } from '../../entities/Edition';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import { requireEdition, requireMaster } from './support';

/** Makes a page use a master, or stop using one (omit `masterId`). */
export class AssignMaster {
  constructor(private readonly editions: EditionRepository) {}

  async execute(input: {
    editionId: string;
    pageNumber: number;
    masterId?: string;
  }): Promise<Edition> {
    const edition = await requireEdition(this.editions, input.editionId);
    const page = findPage(edition, input.pageNumber);
    if (input.masterId !== undefined) requireMaster(edition, input.masterId);

    const { masterId: _old, ...rest } = page;
    const updated: Edition = {
      ...edition,
      pages: edition.pages.map((p) =>
        p.number === page.number
          ? { ...rest, ...(input.masterId !== undefined && { masterId: input.masterId }) }
          : p,
      ),
    };
    await this.editions.save(updated);
    return updated;
  }
}

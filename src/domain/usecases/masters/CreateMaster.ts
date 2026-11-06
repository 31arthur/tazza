import { findPage, replacePage, type Edition } from '../../entities/Edition';
import type { Master } from '../../entities/Master';
import { reidentifyObjects } from '../../layout/template';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { mastersOf, requireEdition } from './support';

export interface CreateMasterInput {
  editionId: string;
  name: string;
  /**
   * Build the master from this page's free objects and assign it to that page. Without it the
   * master starts empty.
   */
  fromPageNumber?: number;
  /** With `fromPageNumber`: take the objects off the page (they now live on the master). */
  move?: boolean;
}

/** Creates a master, optionally from the objects already on a page. */
export class CreateMaster {
  constructor(
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: CreateMasterInput): Promise<{ edition: Edition; masterId: string }> {
    const edition = await requireEdition(this.editions, input.editionId);
    const page =
      input.fromPageNumber === undefined ? undefined : findPage(edition, input.fromPageNumber);

    const master: Master = {
      id: this.ids.next(),
      name: input.name.trim() || 'Master',
      objects: page ? reidentifyObjects(page.objects ?? [], this.ids) : [],
    };

    let updated: Edition = { ...edition, masters: [...mastersOf(edition), master] };
    if (page) {
      updated = replacePage(updated, {
        ...page,
        masterId: master.id,
        ...(input.move !== false && { objects: [] }),
      });
    }
    await this.editions.save(updated);
    return { edition: updated, masterId: master.id };
  }
}

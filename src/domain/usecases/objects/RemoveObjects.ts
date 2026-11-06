import type { Edition } from '../../entities/Edition';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { PageRef } from '../layout/support';
import { changePageObjects, selectionOf } from './support';

/** Deletes objects, including the rest of any group they belong to. */
export class RemoveObjects {
  constructor(private readonly editions: EditionRepository) {}

  execute(ref: PageRef & { objectIds: readonly string[] }): Promise<Edition> {
    return changePageObjects(this.editions, ref, (objects) => {
      const doomed = new Set(selectionOf(objects, ref.objectIds).map((o) => o.id));
      return objects.filter((o) => !doomed.has(o.id));
    });
  }
}

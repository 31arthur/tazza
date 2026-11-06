import type { Edition } from '../../entities/Edition';
import { applyObjectPatch } from '../../layout/objects';
import type { IdPatch } from '../../layout/selection';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { PageRef } from '../layout/support';
import { changePageObjects, requireObject } from './support';

/**
 * Changes properties of one or more objects in a single step (so one undo reverts them all):
 * position, size, rotation, colours, text, lock, hide.
 */
export class UpdateObjects {
  constructor(private readonly editions: EditionRepository) {}

  execute(ref: PageRef & { updates: readonly IdPatch[] }): Promise<Edition> {
    return changePageObjects(this.editions, ref, (objects) => {
      ref.updates.forEach(({ id }) => requireObject(objects, id));
      const byId = new Map(ref.updates.map((u) => [u.id, u.patch]));
      return objects.map((o) => {
        const patch = byId.get(o.id);
        return patch ? applyObjectPatch(o, patch) : o;
      });
    });
  }
}

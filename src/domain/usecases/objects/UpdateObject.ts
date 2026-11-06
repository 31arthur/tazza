import type { Edition } from '../../entities/Edition';
import { applyObjectPatch, type ObjectPatch } from '../../layout/objects';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { PageRef } from '../layout/support';
import { changePageObjects, requireObject } from './support';

/** Changes any property of one object: position, size, rotation, colours, text, lock, hide. */
export class UpdateObject {
  constructor(private readonly editions: EditionRepository) {}

  execute(ref: PageRef & { objectId: string; patch: ObjectPatch }): Promise<Edition> {
    return changePageObjects(this.editions, ref, (objects) => {
      const current = requireObject(objects, ref.objectId);
      const updated = applyObjectPatch(current, ref.patch);
      return objects.map((o) => (o.id === ref.objectId ? updated : o));
    });
  }
}

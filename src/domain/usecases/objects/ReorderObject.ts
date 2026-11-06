import type { Edition } from '../../entities/Edition';
import { reorderObjects, type ArrangeOp } from '../../layout/objects';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { PageRef } from '../layout/support';
import { changePageObjects, requireObject } from './support';

/** Moves an object in the stacking order: to front, to back, or one step either way. */
export class ReorderObject {
  constructor(private readonly editions: EditionRepository) {}

  execute(ref: PageRef & { objectId: string; op: ArrangeOp }): Promise<Edition> {
    return changePageObjects(this.editions, ref, (objects) => {
      requireObject(objects, ref.objectId);
      return reorderObjects(objects, ref.objectId, ref.op);
    });
  }
}

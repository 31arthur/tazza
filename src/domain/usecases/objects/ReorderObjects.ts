import type { Edition } from '../../entities/Edition';
import type { ArrangeOp } from '../../layout/objects';
import { reorderMany } from '../../layout/selection';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { PageRef } from '../layout/support';
import { changePageObjects, selectionOf } from './support';

/** Moves objects in the stacking order: to front, to back, or one step either way. */
export class ReorderObjects {
  constructor(private readonly editions: EditionRepository) {}

  execute(ref: PageRef & { objectIds: readonly string[]; op: ArrangeOp }): Promise<Edition> {
    return changePageObjects(this.editions, ref, (objects) =>
      reorderMany(
        objects,
        selectionOf(objects, ref.objectIds).map((o) => o.id),
        ref.op,
      ),
    );
  }
}

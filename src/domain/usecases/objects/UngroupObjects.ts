import type { Edition } from '../../entities/Edition';
import { ungroupObjects } from '../../layout/selection';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { PageRef } from '../layout/support';
import { changePageObjects, selectionOf } from './support';

/** Breaks the selected groups apart. */
export class UngroupObjects {
  constructor(private readonly editions: EditionRepository) {}

  execute(ref: PageRef & { objectIds: readonly string[] }): Promise<Edition> {
    return changePageObjects(this.editions, ref, (objects) =>
      ungroupObjects(
        objects,
        selectionOf(objects, ref.objectIds).map((o) => o.id),
      ),
    );
  }
}

import type { Edition } from '../../entities/Edition';
import { applyObjectPatch } from '../../layout/objects';
import { distributeMany, type DistributeAxis } from '../../layout/selection';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { PageRef } from '../layout/support';
import { changePageObjects, selectionOf } from './support';

/** Spaces three or more objects evenly; the outermost two stay put. */
export class DistributeObjects {
  constructor(private readonly editions: EditionRepository) {}

  execute(
    ref: PageRef & { objectIds: readonly string[]; axis: DistributeAxis },
  ): Promise<Edition> {
    return changePageObjects(this.editions, ref, (objects) => {
      const chosen = selectionOf(objects, ref.objectIds).filter((o) => !o.locked);
      const byId = new Map(distributeMany(chosen, ref.axis).map((p) => [p.id, p.patch]));
      return objects.map((o) => {
        const patch = byId.get(o.id);
        return patch ? applyObjectPatch(o, patch) : o;
      });
    });
  }
}

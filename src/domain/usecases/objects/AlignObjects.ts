import type { Edition } from '../../entities/Edition';
import { applyObjectPatch, type AlignMode } from '../../layout/objects';
import { alignMany, boundsOf, type AlignTarget } from '../../layout/selection';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import { GRID, liveRectMm } from '../../services/PageGeometry';
import type { PageRef } from '../layout/support';
import { changePageObjects, selectionOf } from './support';

/** Aligns objects to each other (their shared bounds), to the margins, or to the page edges. */
export class AlignObjects {
  constructor(private readonly editions: EditionRepository) {}

  execute(
    ref: PageRef & { objectIds: readonly string[]; mode: AlignMode; to: AlignTarget },
  ): Promise<Edition> {
    return changePageObjects(this.editions, ref, (objects) => {
      const chosen = selectionOf(objects, ref.objectIds).filter((o) => !o.locked);
      const reference =
        ref.to === 'page'
          ? { x: 0, y: 0, w: GRID.pageWidthMm, h: GRID.pageHeightMm }
          : ref.to === 'live'
            ? liveRectMm(ref.pageNumber)
            : boundsOf(chosen);
      if (!reference || (ref.to === 'selection' && chosen.length < 2)) return objects;

      // To the margins or page, a group moves as one block; to each other, each object moves.
      const patches = alignMany(chosen, ref.mode, reference);
      const byId = new Map(patches.map((p) => [p.id, p.patch]));
      return objects.map((o) => {
        const patch = byId.get(o.id);
        return patch ? applyObjectPatch(o, patch) : o;
      });
    });
  }
}

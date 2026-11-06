import type { Edition } from '../../entities/Edition';
import { alignPosition, applyObjectPatch, type AlignMode } from '../../layout/objects';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import { GRID, liveRectMm } from '../../services/PageGeometry';
import type { PageRef } from '../layout/support';
import { changePageObjects, requireObject } from './support';

/** Aligns an object to the page edges or to the live area (inside the margins). */
export class AlignObject {
  constructor(private readonly editions: EditionRepository) {}

  execute(
    ref: PageRef & { objectId: string; mode: AlignMode; to: 'page' | 'live' },
  ): Promise<Edition> {
    const reference =
      ref.to === 'page'
        ? { x: 0, y: 0, w: GRID.pageWidthMm, h: GRID.pageHeightMm }
        : liveRectMm(ref.pageNumber);
    return changePageObjects(this.editions, ref, (objects) => {
      const current = requireObject(objects, ref.objectId);
      const moved = applyObjectPatch(current, alignPosition(current, ref.mode, reference));
      return objects.map((o) => (o.id === ref.objectId ? moved : o));
    });
  }
}

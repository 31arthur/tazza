import type { Edition } from '../../entities/Edition';
import { LayoutError } from '../../errors/DomainError';
import { groupObjects } from '../../layout/selection';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import type { PageRef } from '../layout/support';
import { changePageObjects, selectionOf } from './support';

/** Groups two or more objects so they select and move together. */
export class GroupObjects {
  constructor(
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  execute(ref: PageRef & { objectIds: readonly string[] }): Promise<Edition> {
    return changePageObjects(this.editions, ref, (objects) => {
      const chosen = selectionOf(objects, ref.objectIds);
      if (chosen.length < 2) throw new LayoutError('Select at least two objects to group');
      return groupObjects(
        objects,
        chosen.map((o) => o.id),
        this.ids.next(),
      );
    });
  }
}

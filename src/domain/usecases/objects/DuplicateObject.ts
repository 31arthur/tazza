import type { Edition } from '../../entities/Edition';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import type { PageRef } from '../layout/support';
import { changePageObjects, requireObject } from './support';

const OFFSET_MM = 5;

/** Copies an object, offset a little, on top of the stack. */
export class DuplicateObject {
  constructor(
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  execute(ref: PageRef & { objectId: string }): Promise<{ edition: Edition; objectId: string }> {
    const copyId = this.ids.next();
    return changePageObjects(this.editions, ref, (objects) => {
      const original = requireObject(objects, ref.objectId);
      return [
        ...objects,
        {
          ...original,
          id: copyId,
          name: `${original.name} copy`,
          x: original.x + OFFSET_MM,
          y: original.y + OFFSET_MM,
          locked: false,
        },
      ];
    }).then((edition) => ({ edition, objectId: copyId }));
  }
}

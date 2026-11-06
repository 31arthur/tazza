import type { Edition } from '../../entities/Edition';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { PageRef } from '../layout/support';
import { changePageObjects, requireObject } from './support';

export class RemoveObject {
  constructor(private readonly editions: EditionRepository) {}

  execute(ref: PageRef & { objectId: string }): Promise<Edition> {
    return changePageObjects(this.editions, ref, (objects) => {
      requireObject(objects, ref.objectId);
      return objects.filter((o) => o.id !== ref.objectId);
    });
  }
}

import type { Edition } from '../../entities/Edition';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import type { PageRef } from '../layout/support';
import { changePageObjects, selectionOf } from './support';

const OFFSET_MM = 5;

/** Copies objects, offset a little, on top of the stack. Copied groups stay grouped together. */
export class DuplicateObjects {
  constructor(
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  execute(
    ref: PageRef & { objectIds: readonly string[] },
  ): Promise<{ edition: Edition; objectIds: string[] }> {
    const copyIds: string[] = [];
    return changePageObjects(this.editions, ref, (objects) => {
      const groupCopies = new Map<string, string>();
      const copies = selectionOf(objects, ref.objectIds).map((original) => {
        const id = this.ids.next();
        copyIds.push(id);
        let groupId = original.groupId;
        if (groupId !== undefined) {
          const copyGroup = groupCopies.get(groupId) ?? this.ids.next();
          groupCopies.set(groupId, copyGroup);
          groupId = copyGroup;
        }
        const { groupId: _old, ...rest } = original;
        return {
          ...rest,
          ...(groupId !== undefined && { groupId }),
          id,
          name: `${original.name} copy`,
          x: original.x + OFFSET_MM,
          y: original.y + OFFSET_MM,
          locked: false,
        };
      });
      return [...objects, ...copies];
    }).then((edition) => ({ edition, objectIds: copyIds }));
  }
}

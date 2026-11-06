import type { Edition } from '../../entities/Edition';
import { createObject, type ObjectTool } from '../../layout/objects';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { changePageObjects } from './support';

/** Adds a text box, shape, line or image frame to a page, on top of everything else. */
export class AddObject {
  constructor(
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  execute(input: {
    editionId: string;
    pageNumber: number;
    tool: ObjectTool;
  }): Promise<{ edition: Edition; objectId: string }> {
    const objectId = this.ids.next();
    return changePageObjects(this.editions, input, (objects) => [
      ...objects,
      createObject(input.tool, objectId, input.pageNumber),
    ]).then((edition) => ({ edition, objectId }));
  }
}

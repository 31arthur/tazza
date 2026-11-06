import type { Edition } from '@domain/entities/Edition';
import type { EditionRepository } from '@domain/ports/repositories/EditionRepository';
import type { TazzaDb } from '../datasources/TazzaDb';
import { editionFromRecord, editionToRecord } from '../mappers/recordMappers';

export class DexieEditionRepository implements EditionRepository {
  constructor(private readonly db: TazzaDb) {}

  async find(id: string): Promise<Edition | undefined> {
    const record = await this.db.editions.get(id);
    return record ? editionFromRecord(record) : undefined;
  }

  async save(edition: Edition): Promise<void> {
    await this.db.editions.put(editionToRecord(edition));
  }
}

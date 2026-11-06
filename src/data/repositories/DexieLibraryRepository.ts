import type { LibraryItem } from '@domain/entities/LibraryItem';
import type { LibraryRepository } from '@domain/ports/repositories/LibraryRepository';
import type { TazzaDb } from '../datasources/TazzaDb';

export class DexieLibraryRepository implements LibraryRepository {
  constructor(private readonly db: TazzaDb) {}

  async list(): Promise<LibraryItem[]> {
    const records = await this.db.library.orderBy('createdAt').reverse().toArray();
    return records.map(({ schema: _schema, ...item }) => item as LibraryItem);
  }

  async save(item: LibraryItem): Promise<void> {
    await this.db.library.put({ ...item, schema: 1 });
  }

  async delete(id: string): Promise<void> {
    await this.db.library.delete(id);
  }
}

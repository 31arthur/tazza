import Dexie, { type EntityTable } from 'dexie';
import type { ArticleRecord } from '../dto/ArticleRecord';
import type { AssetRecord } from '../dto/AssetRecord';
import type { EditionRecord } from '../dto/EditionRecord';

const STORES = {
  articles: 'id, editionId, updatedAt',
  editions: 'id',
  assets: 'id',
};

export class TazzaDb extends Dexie {
  articles!: EntityTable<ArticleRecord, 'id'>;
  editions!: EntityTable<EditionRecord, 'id'>;
  assets!: EntityTable<AssetRecord, 'id'>;

  constructor(name = 'tazza') {
    super(name);
    this.version(1).stores(STORES);
    // v2: pages changed from free-floating blocks to a tiled layout tree. Layouts are
    // rebuilt on demand; articles and images are untouched.
    this.version(2)
      .stores(STORES)
      .upgrade((tx) => tx.table('editions').clear());
  }
}

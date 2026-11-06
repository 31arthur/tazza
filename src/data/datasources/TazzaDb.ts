import Dexie, { type EntityTable } from 'dexie';
import type { ArticleRecord } from '../dto/ArticleRecord';
import type { AssetRecord } from '../dto/AssetRecord';
import type { EditionRecord } from '../dto/EditionRecord';
import type { LibraryRecord } from '../dto/LibraryRecord';

const STORES = {
  articles: 'id, editionId, updatedAt',
  editions: 'id',
  assets: 'id',
};

export class TazzaDb extends Dexie {
  articles!: EntityTable<ArticleRecord, 'id'>;
  editions!: EntityTable<EditionRecord, 'id'>;
  assets!: EntityTable<AssetRecord, 'id'>;
  library!: EntityTable<LibraryRecord, 'id'>;

  constructor(name = 'tazza') {
    super(name);
    this.version(1).stores(STORES);
    // v2: pages changed from free-floating blocks to a tiled layout tree. Layouts are
    // rebuilt on demand; articles and images are untouched.
    this.version(2)
      .stores(STORES)
      .upgrade((tx) => tx.table('editions').clear());
    // v3: the library of reusable templates, styles and the brand kit. Nothing else changes.
    this.version(3).stores({ ...STORES, library: 'id, kind, createdAt' });
    // v4: photos get an index on when they were added, for the photo library.
    this.version(4).stores({
      ...STORES,
      assets: 'id, createdAt',
      library: 'id, kind, createdAt',
    });
  }
}

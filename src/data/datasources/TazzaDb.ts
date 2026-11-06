import Dexie, { type EntityTable } from 'dexie';
import type { ArticleRecord } from '../dto/ArticleRecord';
import type { AssetRecord } from '../dto/AssetRecord';
import type { EditionRecord } from '../dto/EditionRecord';

export class TazzaDb extends Dexie {
  articles!: EntityTable<ArticleRecord, 'id'>;
  editions!: EntityTable<EditionRecord, 'id'>;
  assets!: EntityTable<AssetRecord, 'id'>;

  constructor(name = 'tazza') {
    super(name);
    this.version(1).stores({
      articles: 'id, editionId, updatedAt',
      editions: 'id',
      assets: 'id',
    });
  }
}

import type { Asset, AssetMeta } from '@domain/entities/Asset';
import type { AssetRepository } from '@domain/ports/repositories/AssetRepository';
import type { TazzaDb } from '../datasources/TazzaDb';

export class DexieAssetRepository implements AssetRepository {
  constructor(private readonly db: TazzaDb) {}

  async put(asset: Asset, blob: Blob): Promise<void> {
    await this.db.assets.put({ ...asset, schema: 1, blob });
  }

  async getBlob(id: string): Promise<Blob | undefined> {
    return (await this.db.assets.get(id))?.blob;
  }

  async list(): Promise<Asset[]> {
    const records = await this.db.assets.toArray();
    return records.map(({ blob: _blob, schema: _schema, ...asset }) => asset);
  }

  async updateMeta(id: string, meta: AssetMeta): Promise<void> {
    await this.db.assets.update(id, meta);
  }

  async delete(id: string): Promise<void> {
    await this.db.assets.delete(id);
  }
}

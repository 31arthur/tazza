import type { Asset } from '@domain/entities/Asset';
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
}

import type { Asset } from '../../entities/Asset';

export interface AssetRepository {
  put(asset: Asset, blob: Blob): Promise<void>;
  getBlob(id: string): Promise<Blob | undefined>;
}

import type { Asset, AssetMeta } from '../../entities/Asset';

export interface AssetRepository {
  put(asset: Asset, blob: Blob): Promise<void>;
  getBlob(id: string): Promise<Blob | undefined>;
  /** Every photo's details (not the pictures), in no particular order. */
  list(): Promise<Asset[]>;
  /** Changes a photo's name, credit, caption or tags. */
  updateMeta(id: string, meta: AssetMeta): Promise<void>;
  delete(id: string): Promise<void>;
}

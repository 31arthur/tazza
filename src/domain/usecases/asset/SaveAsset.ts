import type { Asset } from '../../entities/Asset';
import type { AssetRepository } from '../../ports/repositories/AssetRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';

export interface SaveAssetInput {
  blob: Blob;
  widthPx: number;
  heightPx: number;
}

export class SaveAsset {
  constructor(
    private readonly assets: AssetRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute({ blob, widthPx, heightPx }: SaveAssetInput): Promise<Asset> {
    const asset: Asset = {
      id: this.ids.next(),
      mimeType: blob.type,
      widthPx,
      heightPx,
      byteSize: blob.size,
    };
    await this.assets.put(asset, blob);
    return asset;
  }
}

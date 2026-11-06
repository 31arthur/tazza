import type { Asset } from '../../entities/Asset';
import type { AssetRepository } from '../../ports/repositories/AssetRepository';
import type { Clock } from '../../ports/services/Clock';
import type { IdGenerator } from '../../ports/services/IdGenerator';

export interface SaveAssetInput {
  blob: Blob;
  widthPx: number;
  heightPx: number;
  /** Usually the file name; shown in the photo library. */
  name?: string;
}

export class SaveAsset {
  constructor(
    private readonly assets: AssetRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute({ blob, widthPx, heightPx, name }: SaveAssetInput): Promise<Asset> {
    const asset: Asset = {
      id: this.ids.next(),
      mimeType: blob.type,
      widthPx,
      heightPx,
      byteSize: blob.size,
      createdAt: this.clock.now(),
      ...(name !== undefined && name.trim() !== '' && { name: name.trim() }),
    };
    await this.assets.put(asset, blob);
    return asset;
  }
}

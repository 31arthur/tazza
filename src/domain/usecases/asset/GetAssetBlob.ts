import type { AssetRepository } from '../../ports/repositories/AssetRepository';

export class GetAssetBlob {
  constructor(private readonly assets: AssetRepository) {}

  execute({ id }: { id: string }): Promise<Blob | undefined> {
    return this.assets.getBlob(id);
  }
}

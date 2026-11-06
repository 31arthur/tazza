import type { AssetMeta } from '../../entities/Asset';
import type { AssetRepository } from '../../ports/repositories/AssetRepository';
import { normalizeTags } from '../../services/assetSearch';

/** Edits a photo's name, credit, default caption and tags. Text is stored NFC-normalised. */
export class UpdateAssetMeta {
  constructor(private readonly assets: AssetRepository) {}

  async execute({ id, meta }: { id: string; meta: AssetMeta }): Promise<void> {
    const clean: AssetMeta = {
      ...(meta.name !== undefined && { name: meta.name.normalize('NFC').trim() }),
      ...(meta.credit !== undefined && { credit: meta.credit.normalize('NFC').trim() }),
      ...(meta.caption !== undefined && { caption: meta.caption.normalize('NFC') }),
      ...(meta.tags !== undefined && { tags: normalizeTags(meta.tags) }),
    };
    await this.assets.updateMeta(id, clean);
  }
}

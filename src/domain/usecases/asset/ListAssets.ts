import type { Asset } from '../../entities/Asset';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { AssetRepository } from '../../ports/repositories/AssetRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import { countAssetUsage } from '../../services/assetUsage';

export interface LibraryAsset {
  readonly asset: Asset;
  /** How many places use this photo (stories, photo boxes, image frames). */
  readonly usage: number;
}

/** The whole photo library, newest first, with where-used counts. */
export class ListAssets {
  constructor(
    private readonly assets: AssetRepository,
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
  ) {}

  async execute(): Promise<LibraryAsset[]> {
    const [assets, articles, editions] = await Promise.all([
      this.assets.list(),
      this.articles.listAll(),
      this.editions.list(),
    ]);
    const usage = countAssetUsage(articles, editions);
    return assets
      .map((asset) => ({ asset, usage: usage.get(asset.id) ?? 0 }))
      .sort((a, b) => (b.asset.createdAt ?? 0) - (a.asset.createdAt ?? 0));
  }
}

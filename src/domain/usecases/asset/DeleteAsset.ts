import { LayoutError } from '../../errors/DomainError';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { AssetRepository } from '../../ports/repositories/AssetRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import { countAssetUsage } from '../../services/assetUsage';

/** Deletes a photo, but never one that a story or page still uses. */
export class DeleteAsset {
  constructor(
    private readonly assets: AssetRepository,
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
  ) {}

  async execute({ id }: { id: string }): Promise<void> {
    const usage = countAssetUsage(await this.articles.listAll(), await this.editions.list());
    const uses = usage.get(id) ?? 0;
    if (uses > 0) throw new LayoutError(`This photo is used in ${uses} place(s) and cannot be deleted`);
    await this.assets.delete(id);
  }
}

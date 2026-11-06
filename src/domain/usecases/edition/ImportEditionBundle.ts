import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { AssetRepository } from '../../ports/repositories/AssetRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { BundleCodec } from '../../ports/services/BundleCodec';

export interface ImportedBundle {
  readonly editionId: string;
  readonly articleCount: number;
  readonly assetCount: number;
}

/**
 * Restores a bundle file. Photos and stories are saved under their own ids, and the edition
 * replaces any edition of the same date, so importing the same file twice changes nothing.
 */
export class ImportEditionBundle {
  constructor(
    private readonly editions: EditionRepository,
    private readonly articles: ArticleRepository,
    private readonly assets: AssetRepository,
    private readonly codec: BundleCodec,
  ) {}

  async execute({ file }: { file: Blob }): Promise<ImportedBundle> {
    const bundle = await this.codec.decode(file);
    for (const { asset, blob } of bundle.assets) await this.assets.put(asset, blob);
    for (const article of bundle.articles) await this.articles.save(article);
    await this.editions.save(bundle.edition);
    return {
      editionId: bundle.edition.id,
      articleCount: bundle.articles.length,
      assetCount: bundle.assets.length,
    };
  }
}

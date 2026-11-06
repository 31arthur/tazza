import { BUNDLE_FORMAT, BUNDLE_VERSION } from '../../entities/EditionBundle';
import { NotFoundError } from '../../errors/DomainError';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { AssetRepository } from '../../ports/repositories/AssetRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { BundleCodec } from '../../ports/services/BundleCodec';
import { assetIdsUsedBy } from '../../services/assetUsage';

export interface ExportedBundle {
  readonly blob: Blob;
  readonly fileName: string;
}

/** Packs an edition, its stories and the photos they use into one downloadable file. */
export class ExportEditionBundle {
  constructor(
    private readonly editions: EditionRepository,
    private readonly articles: ArticleRepository,
    private readonly assets: AssetRepository,
    private readonly codec: BundleCodec,
  ) {}

  async execute({ editionId }: { editionId: string }): Promise<ExportedBundle> {
    const edition = await this.editions.find(editionId);
    if (!edition) throw new NotFoundError(`Edition ${editionId} not found`);
    const articles = await this.articles.listByEdition(editionId);
    const wanted = new Set(assetIdsUsedBy(edition, articles));
    const known = (await this.assets.list()).filter((a) => wanted.has(a.id));
    const assets = (
      await Promise.all(
        known.map(async (asset) => {
          const blob = await this.assets.getBlob(asset.id);
          return blob ? { asset, blob } : undefined;
        }),
      )
    ).filter((a): a is { asset: (typeof known)[number]; blob: Blob } => a !== undefined);

    const blob = await this.codec.encode({
      format: BUNDLE_FORMAT,
      version: BUNDLE_VERSION,
      edition,
      articles,
      assets,
    });
    return { blob, fileName: `tazza-${editionId}.tazza.json` };
  }
}

import type { Article, ArticleBody } from '../../entities/Article';
import type { Asset } from '../../entities/Asset';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { AssetRepository } from '../../ports/repositories/AssetRepository';
import type { Clock } from '../../ports/services/Clock';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { SAMPLE_STORIES, type SampleImageKey } from '../../samples/sampleStories';

export interface SampleImage {
  blob: Blob;
  widthPx: number;
  heightPx: number;
}

/** Adds invented stories (with images) to an edition so the editor and layout can be tried out. */
export class LoadSampleStories {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly assets: AssetRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute({
    editionId,
    images,
  }: {
    editionId: string;
    images: Readonly<Record<SampleImageKey, SampleImage>>;
  }): Promise<Article[]> {
    // Store each image once and remember the real asset id for its sample key.
    const assetIds = new Map<string, string>();
    for (const [key, image] of Object.entries(images)) {
      const asset: Asset = {
        id: this.ids.next(),
        mimeType: image.blob.type,
        widthPx: image.widthPx,
        heightPx: image.heightPx,
        byteSize: image.blob.size,
      };
      await this.assets.put(asset, image.blob);
      assetIds.set(`sample:${key}`, asset.id);
    }

    const base = this.clock.now();
    const created: Article[] = [];
    for (const [index, story] of SAMPLE_STORIES.entries()) {
      const body: ArticleBody = story.body.map((node) =>
        node.type === 'image'
          ? { ...node, assetId: assetIds.get(node.assetId) ?? node.assetId }
          : node,
      );
      const article: Article = {
        id: this.ids.next(),
        editionId,
        headline: story.headline,
        subHeadline: story.subHeadline,
        byline: story.byline,
        ...(story.dateline && { dateline: story.dateline }),
        body,
        // Offset keeps the writing order stable even though all are created in the same instant.
        createdAt: base + index,
        updatedAt: base + index,
      };
      await this.articles.save(article);
      created.push(article);
    }
    return created;
  }
}

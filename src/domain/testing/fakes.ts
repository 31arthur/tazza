import type { Article } from '../entities/Article';
import type { Asset } from '../entities/Asset';
import type { Edition } from '../entities/Edition';
import { NotFoundError } from '../errors/DomainError';
import type { ArticleRepository } from '../ports/repositories/ArticleRepository';
import type { AssetRepository } from '../ports/repositories/AssetRepository';
import type { EditionRepository } from '../ports/repositories/EditionRepository';
import type { LibraryItem } from '../entities/LibraryItem';
import type { LibraryRepository } from '../ports/repositories/LibraryRepository';
import type { Clock } from '../ports/services/Clock';
import type { IdGenerator } from '../ports/services/IdGenerator';

export class InMemoryArticleRepository implements ArticleRepository {
  readonly items = new Map<string, Article>();
  async getById(id: string): Promise<Article> {
    const found = this.items.get(id);
    if (!found) throw new NotFoundError(`Article ${id} not found`);
    return found;
  }
  async listByEdition(editionId: string): Promise<Article[]> {
    return [...this.items.values()].filter((a) => a.editionId === editionId);
  }
  async save(article: Article): Promise<void> {
    this.items.set(article.id, article);
  }
  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

export class InMemoryEditionRepository implements EditionRepository {
  readonly items = new Map<string, Edition>();
  async find(id: string): Promise<Edition | undefined> {
    return this.items.get(id);
  }
  async save(edition: Edition): Promise<void> {
    this.items.set(edition.id, edition);
  }
}

export class InMemoryAssetRepository implements AssetRepository {
  readonly items = new Map<string, { asset: Asset; blob: Blob }>();
  async put(asset: Asset, blob: Blob): Promise<void> {
    this.items.set(asset.id, { asset, blob });
  }
  async getBlob(id: string): Promise<Blob | undefined> {
    return this.items.get(id)?.blob;
  }
}

export class InMemoryLibraryRepository implements LibraryRepository {
  readonly items = new Map<string, LibraryItem>();
  async list(): Promise<LibraryItem[]> {
    return [...this.items.values()];
  }
  async save(item: LibraryItem): Promise<void> {
    this.items.set(item.id, item);
  }
  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

export class FixedClock implements Clock {
  constructor(private time = 1_000) {}
  now(): number {
    return (this.time += 1);
  }
}

export class SequentialIds implements IdGenerator {
  private n = 0;
  next(): string {
    this.n += 1;
    return `id-${this.n}`;
  }
}

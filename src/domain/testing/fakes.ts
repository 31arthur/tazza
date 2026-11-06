import type { Article } from '../entities/Article';
import type { Asset, AssetMeta } from '../entities/Asset';
import type { Edition } from '../entities/Edition';
import { NotFoundError } from '../errors/DomainError';
import type { ArticleRepository } from '../ports/repositories/ArticleRepository';
import type { AssetRepository } from '../ports/repositories/AssetRepository';
import type { EditionRepository } from '../ports/repositories/EditionRepository';
import type { LibraryItem } from '../entities/LibraryItem';
import type { LibraryRepository } from '../ports/repositories/LibraryRepository';
import { DEFAULT_SYNC_SETTINGS, EMPTY_SYNC_STATE, type SyncSettings, type SyncState } from '../entities/Sync';
import type { SyncStateRepository } from '../ports/repositories/SyncStateRepository';
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
  async listAll(): Promise<Article[]> {
    return [...this.items.values()];
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
  async list(): Promise<Edition[]> {
    return [...this.items.values()];
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
  async list(): Promise<Asset[]> {
    return [...this.items.values()].map((i) => i.asset);
  }
  async updateMeta(id: string, meta: AssetMeta): Promise<void> {
    const found = this.items.get(id);
    if (found) this.items.set(id, { ...found, asset: { ...found.asset, ...meta } });
  }
  async delete(id: string): Promise<void> {
    this.items.delete(id);
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

export class InMemorySyncState implements SyncStateRepository {
  state: SyncState = EMPTY_SYNC_STATE;
  settings: SyncSettings = DEFAULT_SYNC_SETTINGS;
  async loadState(): Promise<SyncState> {
    return this.state;
  }
  async saveState(state: SyncState): Promise<void> {
    this.state = state;
  }
  loadSettings(): SyncSettings {
    return this.settings;
  }
  saveSettings(settings: SyncSettings): void {
    this.settings = settings;
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

import type { Article } from '@domain/entities/Article';
import { NotFoundError } from '@domain/errors/DomainError';
import type { ArticleRepository } from '@domain/ports/repositories/ArticleRepository';
import type { TazzaDb } from '../datasources/TazzaDb';
import { articleFromRecord, articleToRecord } from '../mappers/recordMappers';

export class DexieArticleRepository implements ArticleRepository {
  constructor(private readonly db: TazzaDb) {}

  async getById(id: string): Promise<Article> {
    const record = await this.db.articles.get(id);
    if (!record) throw new NotFoundError(`Article ${id} not found`);
    return articleFromRecord(record);
  }

  async listByEdition(editionId: string): Promise<Article[]> {
    const records = await this.db.articles.where('editionId').equals(editionId).toArray();
    return records.map(articleFromRecord);
  }

  async save(article: Article): Promise<void> {
    await this.db.articles.put(articleToRecord(article));
  }

  async delete(id: string): Promise<void> {
    await this.db.articles.delete(id);
  }
}

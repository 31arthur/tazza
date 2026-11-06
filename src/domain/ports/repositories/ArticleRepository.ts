import type { Article } from '../../entities/Article';

export interface ArticleRepository {
  /** Throws NotFoundError when absent. */
  getById(id: string): Promise<Article>;
  listByEdition(editionId: string): Promise<Article[]>;
  save(article: Article): Promise<void>;
  delete(id: string): Promise<void>;
}

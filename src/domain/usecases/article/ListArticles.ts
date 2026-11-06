import type { Article } from '../../entities/Article';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';

export class ListArticles {
  constructor(private readonly articles: ArticleRepository) {}

  async execute({ editionId }: { editionId: string }): Promise<Article[]> {
    const list = await this.articles.listByEdition(editionId);
    return [...list].sort((a, b) => a.createdAt - b.createdAt);
  }
}

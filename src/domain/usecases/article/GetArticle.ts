import type { Article } from '../../entities/Article';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';

export class GetArticle {
  constructor(private readonly articles: ArticleRepository) {}

  execute({ id }: { id: string }): Promise<Article> {
    return this.articles.getById(id);
  }
}

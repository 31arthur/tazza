import type { Article } from '../../entities/Article';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { Clock } from '../../ports/services/Clock';
import type { IdGenerator } from '../../ports/services/IdGenerator';

export class CreateArticle {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute({ editionId }: { editionId: string }): Promise<Article> {
    const now = this.clock.now();
    const article: Article = {
      id: this.ids.next(),
      editionId,
      headline: '',
      subHeadline: '',
      byline: '',
      body: [{ type: 'paragraph', children: [] }],
      createdAt: now,
      updatedAt: now,
    };
    await this.articles.save(article);
    return article;
  }
}

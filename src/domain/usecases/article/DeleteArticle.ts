import { withoutArticle } from '../../entities/Edition';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';

export class DeleteArticle {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
  ) {}

  async execute({ id }: { id: string }): Promise<void> {
    const article = await this.articles.getById(id);
    const edition = await this.editions.find(article.editionId);
    if (edition) await this.editions.save(withoutArticle(edition, id));
    await this.articles.delete(id);
  }
}

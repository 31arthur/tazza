import { statusOf, type Article, type ArticlePatch } from '../../entities/Article';
import { canEditText, type Actor } from '../../entities/Workflow';
import { WorkflowError } from '../../errors/DomainError';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { Clock } from '../../ports/services/Clock';

export class UpdateArticle {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly clock: Clock,
  ) {}

  async execute({
    id,
    patch,
    actor,
  }: {
    id: string;
    patch: ArticlePatch;
    actor?: Actor;
  }): Promise<Article> {
    const current = await this.articles.getById(id);
    if (actor && !canEditText(actor.role, statusOf(current))) {
      throw new WorkflowError(`A ${actor.role} cannot change a story that is ${statusOf(current)}.`);
    }
    const updated: Article = {
      ...current,
      ...patch,
      // Telugu must survive unchanged: store canonical (NFC) form only.
      ...(patch.headline !== undefined && { headline: patch.headline.normalize('NFC') }),
      ...(patch.subHeadline !== undefined && { subHeadline: patch.subHeadline.normalize('NFC') }),
      ...(patch.byline !== undefined && { byline: patch.byline.normalize('NFC') }),
      ...(patch.dateline !== undefined && { dateline: patch.dateline.normalize('NFC') }),
      updatedAt: this.clock.now(),
    };
    await this.articles.save(updated);
    return updated;
  }
}

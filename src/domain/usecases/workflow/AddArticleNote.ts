import type { Article } from '../../entities/Article';
import type { Actor } from '../../entities/Workflow';
import { WorkflowError } from '../../errors/DomainError';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { Clock } from '../../ports/services/Clock';
import type { IdGenerator } from '../../ports/services/IdGenerator';

/** Adds a comment to a story. Everyone, designers included, may comment at any stage. */
export class AddArticleNote {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute({ id, actor, text }: { id: string; actor: Actor; text: string }): Promise<Article> {
    const clean = text.normalize('NFC').trim();
    if (clean === '') throw new WorkflowError('A comment cannot be empty.');
    const article = await this.articles.getById(id);
    const updated: Article = {
      ...article,
      notes: [
        ...(article.notes ?? []),
        {
          id: this.ids.next(),
          author: actor.name,
          role: actor.role,
          text: clean,
          at: this.clock.now(),
          resolved: false,
        },
      ],
    };
    await this.articles.save(updated);
    return updated;
  }
}

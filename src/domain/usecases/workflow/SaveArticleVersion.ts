import type { Article } from '../../entities/Article';
import type { Actor } from '../../entities/Workflow';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { Clock } from '../../ports/services/Clock';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { sameText, snapshotOf, withVersion } from '../../services/articleVersions';

/** Keeps a copy of the story's text as it is now. Saving unchanged text adds nothing. */
export class SaveArticleVersion {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute({ id, actor, label }: { id: string; actor: Actor; label?: string }): Promise<Article> {
    const article = await this.articles.getById(id);
    const snapshot = snapshotOf(article, {
      id: this.ids.next(),
      at: this.clock.now(),
      author: actor.name,
      label: (label ?? '').trim(),
    });
    if (sameText(article.versions?.at(-1), snapshot)) return article;
    const updated: Article = { ...article, versions: withVersion(article, snapshot) };
    await this.articles.save(updated);
    return updated;
  }
}

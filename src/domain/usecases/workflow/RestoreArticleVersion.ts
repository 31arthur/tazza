import { statusOf, type Article } from '../../entities/Article';
import { canEditText, type Actor } from '../../entities/Workflow';
import { WorkflowError } from '../../errors/DomainError';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { Clock } from '../../ports/services/Clock';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { sameText, snapshotOf, versionPatch, withVersion } from '../../services/articleVersions';

/** Puts an earlier version's text back, first keeping the current text so nothing is lost. */
export class RestoreArticleVersion {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute({
    id,
    versionId,
    actor,
  }: {
    id: string;
    versionId: string;
    actor: Actor;
  }): Promise<Article> {
    const article = await this.articles.getById(id);
    if (!canEditText(actor.role, statusOf(article))) {
      throw new WorkflowError(`A ${actor.role} cannot change this story now.`);
    }
    const version = article.versions?.find((v) => v.id === versionId);
    if (!version) throw new WorkflowError('That version no longer exists.');

    const at = this.clock.now();
    const current = snapshotOf(article, {
      id: this.ids.next(),
      at,
      author: actor.name,
      label: 'before restore',
    });
    const versions = sameText(article.versions?.at(-1), current)
      ? article.versions
      : withVersion(article, current);
    const { dateline: _dateline, ...rest } = article;
    const updated: Article = {
      ...rest,
      ...versionPatch(version),
      ...(versions && { versions }),
      updatedAt: at,
    };
    await this.articles.save(updated);
    return updated;
  }
}

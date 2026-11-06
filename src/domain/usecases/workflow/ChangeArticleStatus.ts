import { statusOf, type Article } from '../../entities/Article';
import { canTransition, type Actor, type ArticleStatus } from '../../entities/Workflow';
import { WorkflowError } from '../../errors/DomainError';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { Clock } from '../../ports/services/Clock';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { sameText, snapshotOf, withVersion } from '../../services/articleVersions';

export interface ChangeArticleStatusInput {
  readonly id: string;
  readonly to: ArticleStatus;
  readonly actor: Actor;
  /** Required when an editor sends a story back to draft: say what to change. */
  readonly note?: string;
}

/**
 * Moves a story along draft, review, approved. Each move is checked against the actor's role,
 * keeps a copy of the text as it was, and writes a line in the story's history.
 */
export class ChangeArticleStatus {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute({ id, to, actor, note }: ChangeArticleStatusInput): Promise<Article> {
    const article = await this.articles.getById(id);
    const from = statusOf(article);
    if (!canTransition(actor.role, from, to)) {
      throw new WorkflowError(`A ${actor.role} cannot move a story from ${from} to ${to}.`);
    }
    const comment = (note ?? '').normalize('NFC').trim();
    if (from === 'review' && to === 'draft' && comment === '') {
      throw new WorkflowError('Say what needs changing when sending a story back.');
    }

    const at = this.clock.now();
    const snapshot = snapshotOf(article, {
      id: this.ids.next(),
      at,
      author: actor.name,
      label: `${from} → ${to}`,
    });
    const versions = sameText(article.versions?.at(-1), snapshot)
      ? article.versions
      : withVersion(article, snapshot);
    const history = {
      id: this.ids.next(),
      author: actor.name,
      role: actor.role,
      text: `${from} → ${to}`,
      at,
      resolved: true,
      system: true,
    } as const;
    const comments =
      comment === ''
        ? []
        : [
            {
              id: this.ids.next(),
              author: actor.name,
              role: actor.role,
              text: comment,
              at,
              resolved: false,
            },
          ];

    const updated: Article = {
      ...article,
      status: to,
      notes: [...(article.notes ?? []), history, ...comments],
      ...(versions && { versions }),
      updatedAt: at,
    };
    await this.articles.save(updated);
    return updated;
  }
}

import type { Article } from '../../entities/Article';
import { WorkflowError } from '../../errors/DomainError';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';

/** Marks a comment as dealt with, or reopens it. History lines cannot be resolved. */
export class ResolveArticleNote {
  constructor(private readonly articles: ArticleRepository) {}

  async execute({
    id,
    noteId,
    resolved,
  }: {
    id: string;
    noteId: string;
    resolved: boolean;
  }): Promise<Article> {
    const article = await this.articles.getById(id);
    const note = article.notes?.find((n) => n.id === noteId);
    if (!note) throw new WorkflowError('That comment no longer exists.');
    if (note.system) throw new WorkflowError('History lines cannot be changed.');
    const updated: Article = {
      ...article,
      notes: (article.notes ?? []).map((n) => (n.id === noteId ? { ...n, resolved } : n)),
    };
    await this.articles.save(updated);
    return updated;
  }
}

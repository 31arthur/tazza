import { findPage, replacePage, type Edition } from '../../entities/Edition';
import { fitPage } from '../../layout/fit';
import { buildTemplate, type TemplateId } from '../../layout/templates';
import {
  emptyLeavesByPriority,
  leavesOf,
  normalize,
  setLeafArticle,
} from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { loadLayoutContext } from './support';

/**
 * Re-structures a page from a template. The page's stories are poured into the new slots in
 * order of importance; any that do not fit go back to the unplaced list.
 */
export class ApplyTemplate {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute({
    editionId,
    pageNumber,
    templateId,
  }: {
    editionId: string;
    pageNumber: number;
    templateId: TemplateId;
  }): Promise<Edition> {
    const { edition, lookup } = await loadLayoutContext(this.articles, this.editions, editionId);
    const page = findPage(edition, pageNumber);

    const existing = leavesOf(page.layout)
      .filter((l) => l.articleId !== undefined)
      .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
      .map((l) => l.articleId as string);

    let layout = buildTemplate(templateId, this.ids);
    const slots = emptyLeavesByPriority(layout);
    existing.slice(0, slots.length).forEach((articleId, i) => {
      const target = slots[i];
      if (target) layout = setLeafArticle(layout, target.id, articleId);
    });

    const updated = replacePage(edition, {
      number: pageNumber,
      layout: fitPage(normalize(layout), pageNumber, lookup),
    });
    await this.editions.save(updated);
    return updated;
  }
}

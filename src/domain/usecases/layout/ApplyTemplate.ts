import { findPage, replacePage, type Edition } from '../../entities/Edition';
import { fitPage } from '../../layout/fit';
import { buildTemplate, type TemplateId } from '../../layout/templates';
import {
  emptyLeavesByPriority,
  isEmptyLeaf,
  leavesOf,
  normalize,
  setLeafArticle,
  setLeafElement,
  type Leaf,
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

    const existing: Leaf[] = leavesOf(page.layout)
      .filter((l) => !isEmptyLeaf(l))
      .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

    let layout = buildTemplate(templateId, this.ids);
    const slots = emptyLeavesByPriority(layout);
    existing.slice(0, slots.length).forEach((held, i) => {
      const target = slots[i];
      if (!target) return;
      layout = held.element
        ? setLeafElement(layout, target.id, held.element)
        : setLeafArticle(layout, target.id, held.articleId);
    });

    const updated = replacePage(edition, {
      number: pageNumber,
      layout: fitPage(normalize(layout), pageNumber, lookup),
    });
    await this.editions.save(updated);
    return updated;
  }
}

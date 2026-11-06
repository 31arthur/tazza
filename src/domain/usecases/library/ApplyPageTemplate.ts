import { findPage, replacePage, type Edition } from '../../entities/Edition';
import { LayoutError } from '../../errors/DomainError';
import { fitPage } from '../../layout/fit';
import { reidentifyLayout, reidentifyObjects } from '../../layout/template';
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
import type { LibraryRepository } from '../../ports/repositories/LibraryRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { loadLayoutContext } from '../layout/support';

/**
 * Starts a page from a saved page template. The page's stories are poured into the template's
 * empty slots in order of importance; the page's objects are replaced by the template's.
 */
export class ApplyPageTemplate {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
    private readonly library: LibraryRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: {
    editionId: string;
    pageNumber: number;
    templateId: string;
  }): Promise<Edition> {
    const item = (await this.library.list()).find((i) => i.id === input.templateId);
    if (item?.kind !== 'pageTemplate') throw new LayoutError('Page template not found');

    const { edition, lookup } = await loadLayoutContext(
      this.articles,
      this.editions,
      input.editionId,
    );
    const page = findPage(edition, input.pageNumber);

    const existing: Leaf[] = leavesOf(page.layout)
      .filter((l) => !isEmptyLeaf(l))
      .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

    let layout = reidentifyLayout(item.page.layout, this.ids);
    const slots = emptyLeavesByPriority(layout);
    existing.slice(0, slots.length).forEach((held, i) => {
      const target = slots[i];
      if (!target) return;
      layout = held.element
        ? setLeafElement(layout, target.id, held.element)
        : setLeafArticle(layout, target.id, held.articleId);
    });

    const updated = replacePage(edition, {
      ...page,
      layout: fitPage(normalize(layout), input.pageNumber, lookup),
      objects: reidentifyObjects(item.page.objects, this.ids),
      guides: item.page.guides,
    });
    await this.editions.save(updated);
    return updated;
  }
}

import type { Article } from '../../entities/Article';
import { placedArticleIds, type Edition, type Page } from '../../entities/Edition';
import { fitPage, pageFill, type ArticleLookup } from '../../layout/fit';
import { autoTemplateCandidates, buildTemplate, slotCount } from '../../layout/templates';
import {
  emptyLeavesByPriority,
  isEmptyLeaf,
  leavesOf,
  makeLeaf,
  normalize,
  pruneEmpty,
  setLeafArticle,
  type LayoutNode,
} from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { storyWeight } from '../../services/CopyfitEstimator';
import { loadLayoutContext } from './support';

/**
 * Pours every unplaced story onto the pages. For each new page it picks the fullest template
 * whose stories still fit the page, so a page is neither crammed nor left with big gaps;
 * the heaviest stories take the most prominent slots.
 */
export class AutoLayout {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute({ editionId }: { editionId: string }): Promise<Edition> {
    const { edition, articles, lookup } = await loadLayoutContext(
      this.articles,
      this.editions,
      editionId,
    );

    const placed = placedArticleIds(edition);
    const queue: Article[] = articles
      .filter((a) => !placed.has(a.id))
      .sort((a, b) => storyWeight(b) - storyWeight(a));

    const fits = (layout: LayoutNode, pageNumber: number, look: ArticleLookup): boolean => {
      const pruned = pruneEmpty(layout);
      return !pruned || pageFill(normalize(pruned), pageNumber, look) <= 1;
    };

    const assign = (layout: LayoutNode, stories: readonly Article[]): LayoutNode => {
      let tree = layout;
      emptyLeavesByPriority(layout).forEach((slot, i) => {
        const story = stories[i];
        if (story) tree = setLeafArticle(tree, slot.id, story.id);
      });
      return tree;
    };

    /** The fullest template whose stories fit; a lone overfull story if none do. */
    const chooseLayout = (pageNumber: number): LayoutNode => {
      for (const id of autoTemplateCandidates(pageNumber)) {
        const count = slotCount(id);
        if (count > queue.length) continue;
        const layout = assign(buildTemplate(id, this.ids), queue.slice(0, count));
        if (fits(layout, pageNumber, lookup)) {
          queue.splice(0, count);
          return layout;
        }
      }
      const first = queue.shift();
      return assign(buildTemplate('blank', this.ids), first ? [first] : []);
    };

    const pages: Page[] = [...edition.pages];
    const touched = new Set<number>();

    pages.forEach((page, i) => {
      if (queue.length === 0) return;
      const hasStories = leavesOf(page.layout).some((l) => !isEmptyLeaf(l));
      if (!hasStories) {
        // An untouched page can take whichever template suits the stories left to place.
        pages[i] = { ...page, layout: chooseLayout(page.number) };
        touched.add(page.number);
        return;
      }
      // A page the editor already started: only top up its empty slots while they fit.
      let tree = page.layout;
      for (const slot of emptyLeavesByPriority(page.layout)) {
        const next = queue[0];
        if (!next) break;
        const candidate = setLeafArticle(tree, slot.id, next.id);
        if (!fits(candidate, page.number, lookup)) break;
        queue.shift();
        tree = candidate;
        touched.add(page.number);
      }
      pages[i] = { ...page, layout: tree };
    });

    while (queue.length > 0) {
      const number = pages.length + 1;
      pages.push({ number, layout: chooseLayout(number) });
      touched.add(number);
    }

    const fitted = pages.map((page) => {
      if (!touched.has(page.number)) return page;
      const pruned = pruneEmpty(page.layout) ?? makeLeaf(this.ids.next());
      return { ...page, layout: fitPage(normalize(pruned), page.number, lookup) };
    });

    const updated: Edition = { ...edition, pages: fitted };
    await this.editions.save(updated);
    return updated;
  }
}

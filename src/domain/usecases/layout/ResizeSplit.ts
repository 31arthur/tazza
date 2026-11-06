import type { Edition } from '../../entities/Edition';
import { resizeSplit } from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import { changePageLayout, type PageRef } from './support';

/** Manual divider drag: stores the sizes as given, without re-fitting the page. */
export class ResizeSplit {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
  ) {}

  execute(ref: PageRef & { splitId: string; sizes: readonly number[] }): Promise<Edition> {
    return changePageLayout(
      { articles: this.articles, editions: this.editions },
      ref,
      (layout) => resizeSplit(layout, ref.splitId, ref.sizes),
      false,
    );
  }
}

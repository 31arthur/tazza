import type { Edition } from '../../entities/Edition';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import { changePageLayout, type PageRef } from './support';

/** Re-fits a page: columns and heights are shared out by how much each story needs. */
export class AutoFitPage {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
  ) {}

  execute(ref: PageRef): Promise<Edition> {
    return changePageLayout({ articles: this.articles, editions: this.editions }, ref, (layout) => layout);
  }
}

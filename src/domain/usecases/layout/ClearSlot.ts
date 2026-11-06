import type { Edition } from '../../entities/Edition';
import { setLeafArticle } from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import { changePageLayout, type PageRef } from './support';

/** Takes the story out of a tile, leaving the tile empty. */
export class ClearSlot {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
  ) {}

  execute(ref: PageRef & { leafId: string }): Promise<Edition> {
    return changePageLayout({ articles: this.articles, editions: this.editions }, ref, (layout) => setLeafArticle(layout, ref.leafId, undefined));
  }
}

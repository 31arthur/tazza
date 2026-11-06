import type { Edition } from '../../entities/Edition';
import { makeLeaf, removeLeaf } from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { changePageLayout, type PageRef } from './support';

/** Deletes the tile itself; its neighbours grow into the space. */
export class RemoveSlot {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  execute(ref: PageRef & { leafId: string }): Promise<Edition> {
    return changePageLayout(
      { articles: this.articles, editions: this.editions },
      ref,
      (layout) => removeLeaf(layout, ref.leafId) ?? makeLeaf(this.ids.next()),
    );
  }
}

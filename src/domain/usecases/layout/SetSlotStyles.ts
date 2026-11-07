import type { Edition } from '../../entities/Edition';
import type { LeafStyle } from '../../layout/style';
import { setLeafStyle } from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import { changePageLayout, type PageRef } from './support';

/** Restyles several tiles of one page in a single step (so one Undo takes it all back). */
export class SetSlotStyles {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
  ) {}

  execute(
    ref: PageRef & { patches: readonly { leafId: string; style: Partial<LeafStyle> }[] },
  ): Promise<Edition> {
    return changePageLayout({ articles: this.articles, editions: this.editions }, ref, (layout) =>
      ref.patches.reduce((node, p) => setLeafStyle(node, p.leafId, p.style), layout),
    );
  }
}

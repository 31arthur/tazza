import type { Edition } from '../../entities/Edition';
import type { LeafStyle } from '../../layout/style';
import { setLeafRole, setLeafStyle, type SlotRole } from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import { changePageLayout, type PageRef } from './support';

/** Overrides how one tile looks (colours, frame, kicker, jump line...); `null` resets it. */
export class SetSlotStyle {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
  ) {}

  execute(
    ref: PageRef & { leafId: string; style: Partial<LeafStyle> | null; role?: SlotRole },
  ): Promise<Edition> {
    return changePageLayout({ articles: this.articles, editions: this.editions }, ref, (layout) =>
      setLeafStyle(ref.role ? setLeafRole(layout, ref.leafId, ref.role) : layout, ref.leafId, ref.style),
    );
  }
}

import type { Edition } from '../../entities/Edition';
import { setLeafRole, type SlotRole } from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import { changePageLayout, type PageRef } from './support';

/** Changes how a tile is styled (banner, lead, story, box or brief) and re-fits the page. */
export class SetSlotRole {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
  ) {}

  execute(ref: PageRef & { leafId: string; role: SlotRole }): Promise<Edition> {
    return changePageLayout({ articles: this.articles, editions: this.editions }, ref, (layout) => setLeafRole(layout, ref.leafId, ref.role));
  }
}

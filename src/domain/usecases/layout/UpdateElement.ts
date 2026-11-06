import type { Edition } from '../../entities/Edition';
import type { Element } from '../../layout/element';
import { setLeafElement } from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import { changePageLayout, type PageRef } from './support';

/** Replaces the content of an element tile (caption, photo, heading and text, label, note). */
export class UpdateElement {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
  ) {}

  execute(ref: PageRef & { leafId: string; element: Element }): Promise<Edition> {
    return changePageLayout({ articles: this.articles, editions: this.editions }, ref, (layout) =>
      setLeafElement(layout, ref.leafId, ref.element),
    );
  }
}

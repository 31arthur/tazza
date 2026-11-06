import { findPage, replacePage, type Edition } from '../../entities/Edition';
import { LayoutError } from '../../errors/DomainError';
import { elementDefaults, type ElementKind } from '../../layout/element';
import { fitPage } from '../../layout/fit';
import {
  appendBottom,
  findLeaf,
  insertBeside,
  isEmptyLeaf,
  makeLeaf,
  normalize,
  type Leaf,
} from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import type { DropZone } from './DropArticle';
import { loadLayoutContext } from './support';

export interface AddElementInput {
  editionId: string;
  pageNumber: number;
  kind: ElementKind;
  /** Where to put it; without a target the element goes along the bottom of the page. */
  targetLeafId?: string;
  zone?: DropZone;
}

/** Adds a photo box, text box, sidebar, label or ad placeholder to a page. */
export class AddElement {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: AddElementInput): Promise<Edition> {
    const { editionId, pageNumber, kind, targetLeafId, zone } = input;
    const ctx = await loadLayoutContext(this.articles, this.editions, editionId);
    const page = findPage(ctx.edition, pageNumber);

    const defaults = elementDefaults(kind);
    const tile: Leaf = {
      ...makeLeaf(this.ids.next(), defaults.role),
      style: defaults.style,
      element: defaults.element,
    };

    let tree = page.layout;
    const target = targetLeafId ? findLeaf(tree, targetLeafId) : undefined;
    if (targetLeafId && !target) throw new LayoutError('Drop target not found');

    if (target && zone && zone !== 'center') {
      tree = insertBeside(tree, target.id, tile, zone, this.ids);
    } else if (target && isEmptyLeaf(target)) {
      // Dropped in the middle of an empty slot: the element takes the slot over.
      tree = insertBeside(tree, target.id, tile, 'bottom', this.ids);
      tree = normalize(tree);
    } else {
      tree = appendBottom(tree, tile, this.ids);
    }

    const updated = replacePage(ctx.edition, {
      number: pageNumber,
      layout: fitPage(normalize(tree), pageNumber, ctx.lookup),
    });
    await this.editions.save(updated);
    return updated;
  }
}

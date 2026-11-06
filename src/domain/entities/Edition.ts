import { LayoutError } from '../errors/DomainError';
import type { Masthead } from '../layout/style';
import type { PageObject } from '../layout/objects';
import type { Guide } from '../layout/snapping';
import { articleIdsOf, clearArticle, type LayoutNode } from '../layout/tree';

export interface Page {
  readonly number: number;
  readonly layout: LayoutNode;
  /** Free objects drawn above the tiles, bottom to top. They never affect how stories fit. */
  readonly objects?: readonly PageObject[];
  /** Ruler guides the designer dragged out; objects snap to them. */
  readonly guides?: readonly Guide[];
}

/** One newspaper edition per calendar date; its id is the ISO date (YYYY-MM-DD). */
export interface Edition {
  readonly id: string;
  readonly pages: readonly Page[];
  /** Overrides of the default masthead (logo, ears, colours). */
  readonly masthead?: Partial<Masthead>;
}

export const newEdition = (id: string, firstPage: LayoutNode): Edition => ({
  id,
  pages: [{ number: 1, layout: firstPage }],
});

export const placedArticleIds = (edition: Edition): Set<string> =>
  new Set(edition.pages.flatMap((p) => articleIdsOf(p.layout)));

/** Page number an article sits on, if it is placed. */
export const pageOf = (edition: Edition, articleId: string): number | undefined =>
  edition.pages.find((p) => articleIdsOf(p.layout).includes(articleId))?.number;

export const findPage = (edition: Edition, pageNumber: number): Page => {
  const page = edition.pages.find((p) => p.number === pageNumber);
  if (!page) throw new LayoutError(`Page ${pageNumber} does not exist`);
  return page;
};

export const replacePage = (edition: Edition, page: Page): Edition => ({
  ...edition,
  // Merge so fields the caller did not mention (such as free objects) are kept.
  pages: edition.pages.map((p) => (p.number === page.number ? { ...p, ...page } : p)),
});

/** Takes an article off every page; its slot stays behind, empty. */
export const withoutArticle = (edition: Edition, articleId: string): Edition => ({
  ...edition,
  pages: edition.pages.map((p) => ({ ...p, layout: clearArticle(p.layout, articleId) })),
});

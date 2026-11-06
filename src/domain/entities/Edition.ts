import { LayoutError } from '../errors/DomainError';
import {
  GRID,
  gridRows,
  placementInBounds,
  placementsOverlap,
  type GridPlacement,
} from '../services/PageGeometry';

export interface Block {
  readonly id: string;
  readonly articleId: string;
  readonly placement: GridPlacement;
}

export interface Page {
  readonly number: number;
  readonly blocks: readonly Block[];
}

/** One newspaper edition per calendar date; its id is the ISO date (YYYY-MM-DD). */
export interface Edition {
  readonly id: string;
  readonly pages: readonly Page[];
}

export const newEdition = (id: string): Edition => ({ id, pages: [{ number: 1, blocks: [] }] });

export const placedArticleIds = (edition: Edition): Set<string> =>
  new Set(edition.pages.flatMap((p) => p.blocks.map((b) => b.articleId)));

export const findPage = (edition: Edition, pageNumber: number): Page => {
  const page = edition.pages.find((p) => p.number === pageNumber);
  if (!page) throw new LayoutError(`Page ${pageNumber} does not exist`);
  return page;
};

export const replacePage = (edition: Edition, page: Page): Edition => ({
  ...edition,
  pages: edition.pages.map((p) => (p.number === page.number ? page : p)),
});

export const withoutArticle = (edition: Edition, articleId: string): Edition => ({
  ...edition,
  pages: edition.pages.map((p) => ({
    ...p,
    blocks: p.blocks.filter((b) => b.articleId !== articleId),
  })),
});

export const assertPlacementValid = (
  page: Page,
  placement: GridPlacement,
  ignoreBlockId?: string,
): void => {
  if (!placementInBounds(placement, page.number)) {
    throw new LayoutError('Block must stay inside the page grid');
  }
  const clash = page.blocks.some(
    (b) => b.id !== ignoreBlockId && placementsOverlap(b.placement, placement),
  );
  if (clash) throw new LayoutError('Blocks cannot overlap');
};

/** First free spot (top-to-bottom, left-to-right) for a block of the given size. */
export const findFreeSpot = (
  page: Page,
  colSpan: number,
  rowSpan: number,
): GridPlacement | undefined => {
  const rows = gridRows(page.number);
  for (let row = 0; row + rowSpan <= rows; row++) {
    for (let col = 0; col + colSpan <= GRID.columns; col++) {
      const candidate = { col, colSpan, row, rowSpan };
      if (!page.blocks.some((b) => placementsOverlap(b.placement, candidate))) return candidate;
    }
  }
  return undefined;
};

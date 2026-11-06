/** All page geometry is in millimetres. A3 portrait on a 6-column grid. */
export const GRID = {
  pageWidthMm: 297,
  pageHeightMm: 420,
  columns: 6,
  gutterMm: 4,
  marginXMm: 10,
  marginTopMm: 10,
  bottomMm: 12,
} as const;

export const COLUMN_WIDTH_MM =
  (GRID.pageWidthMm - 2 * GRID.marginXMm - (GRID.columns - 1) * GRID.gutterMm) / GRID.columns;

/** Height reserved for the masthead (page 1) or the running header (other pages). */
export const headerHeightMm = (pageNumber: number): number => (pageNumber === 1 ? 44 : 10);

export const liveTopMm = (pageNumber: number): number =>
  GRID.marginTopMm + headerHeightMm(pageNumber);

export interface RectMm {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** The area of a page that holds stories (everything inside margins, header and folio). */
export const liveRectMm = (pageNumber: number): RectMm => ({
  x: GRID.marginXMm,
  y: liveTopMm(pageNumber),
  w: GRID.pageWidthMm - 2 * GRID.marginXMm,
  h: GRID.pageHeightMm - liveTopMm(pageNumber) - GRID.bottomMm,
});

/** Width of a story that spans `cols` columns, including the gutters between them. */
export const spanWidthMm = (cols: number): number =>
  cols * COLUMN_WIDTH_MM + (cols - 1) * GRID.gutterMm;

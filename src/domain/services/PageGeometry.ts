/** All page geometry is in millimetres. A3 portrait on a 6-column grid. */
export const GRID = {
  pageWidthMm: 297,
  pageHeightMm: 420,
  columns: 6,
  gutterMm: 4,
  marginXMm: 10,
  marginTopMm: 10,
  bottomMm: 12,
  rowMm: 10,
} as const;

export const COLUMN_WIDTH_MM =
  (GRID.pageWidthMm - 2 * GRID.marginXMm - (GRID.columns - 1) * GRID.gutterMm) / GRID.columns;

/** Height reserved for the masthead (page 1) or the running header (other pages). */
export const headerHeightMm = (pageNumber: number): number => (pageNumber === 1 ? 44 : 10);

export const liveTopMm = (pageNumber: number): number =>
  GRID.marginTopMm + headerHeightMm(pageNumber);

export const gridRows = (pageNumber: number): number =>
  Math.floor((GRID.pageHeightMm - liveTopMm(pageNumber) - GRID.bottomMm) / GRID.rowMm);

export interface GridPlacement {
  readonly col: number;
  readonly colSpan: number;
  readonly row: number;
  readonly rowSpan: number;
}

export interface RectMm {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export const spanWidthMm = (colSpan: number): number =>
  colSpan * COLUMN_WIDTH_MM + (colSpan - 1) * GRID.gutterMm;

export const placementRectMm = (p: GridPlacement, pageNumber: number): RectMm => ({
  x: GRID.marginXMm + p.col * (COLUMN_WIDTH_MM + GRID.gutterMm),
  y: liveTopMm(pageNumber) + p.row * GRID.rowMm,
  w: spanWidthMm(p.colSpan),
  h: p.rowSpan * GRID.rowMm,
});

export const placementInBounds = (p: GridPlacement, pageNumber: number): boolean =>
  Number.isInteger(p.col) &&
  Number.isInteger(p.colSpan) &&
  Number.isInteger(p.row) &&
  Number.isInteger(p.rowSpan) &&
  p.col >= 0 &&
  p.row >= 0 &&
  p.colSpan >= 1 &&
  p.rowSpan >= 1 &&
  p.col + p.colSpan <= GRID.columns &&
  p.row + p.rowSpan <= gridRows(pageNumber);

export const placementsOverlap = (a: GridPlacement, b: GridPlacement): boolean =>
  a.col < b.col + b.colSpan &&
  b.col < a.col + a.colSpan &&
  a.row < b.row + b.rowSpan &&
  b.row < a.row + a.rowSpan;

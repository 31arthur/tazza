import { bodyParagraphs, type Article } from '../entities/Article';
import { detectLanguage } from './detectLanguage';
import { COLUMN_WIDTH_MM, GRID, gridRows, spanWidthMm } from './PageGeometry';

const PT_MM = 25.4 / 72;
export const BODY_PT = 9.5;

/** Headline point size by the number of columns a story spans. */
export const headlinePt = (colSpan: number): number =>
  ({ 1: 13, 2: 17, 3: 22, 4: 28, 5: 32, 6: 38 })[colSpan] ?? 17;

const IMAGE_ASPECT = 0.66;

/** Rough height in mm of a run of text set at `ptSize` across `widthMm`. */
const textHeightMm = (
  text: string,
  widthMm: number,
  ptSize: number,
  headline: boolean,
): number => {
  if (text.trim() === '') return 0;
  const te = detectLanguage(text) === 'te';
  const sizeMm = ptSize * PT_MM;
  // Average advance per character, measured from real renders (justified text wastes some space).
  const charW = sizeMm * (headline ? (te ? 0.6 : 0.62) : te ? 0.45 : 0.54);
  const lineH = sizeMm * (te ? 1.6 : headline ? 1.15 : 1.38);
  const charsPerLine = Math.max(4, Math.floor(widthMm / charW));
  return Math.ceil(text.length / charsPerLine) * lineH;
};

/** Estimated block height in grid rows for an article set across `colSpan` columns. */
export const estimateRows = (article: Article, colSpan: number): number => {
  const width = spanWidthMm(colSpan);
  const head = textHeightMm(article.headline, width, headlinePt(colSpan), true);
  const sub = textHeightMm(article.subHeadline, width, 11, false);

  const bodyMm = bodyParagraphs(article.body).reduce(
    (sum, p) => sum + textHeightMm(p, COLUMN_WIDTH_MM, BODY_PT, false) + 1.2,
    0,
  );
  const images = article.body.filter((n) => n.type === 'image').length;
  const imageMm = images * (COLUMN_WIDTH_MM * IMAGE_ASPECT + 12);

  // Columns never balance perfectly and images cannot split, so keep a safety margin.
  const flowMm = ((bodyMm + imageMm) / colSpan) * 1.2 + 6;
  const totalMm = head + sub + 8 + flowMm;
  return Math.max(3, Math.ceil(totalMm / GRID.rowMm));
};

export const suggestColSpan = (article: Article): number => {
  const chars = bodyParagraphs(article.body).join('').length;
  if (chars <= 400) return 2;
  if (chars <= 1000) return 3;
  if (chars <= 2000) return 4;
  return 6;
};

export interface BlockSize {
  readonly colSpan: number;
  readonly rowSpan: number;
}

/** Suggested block size; widens the story until it fits on one page, else clamps. */
export const estimateBlockSize = (article: Article): BlockSize => {
  const maxRows = gridRows(2);
  let colSpan = suggestColSpan(article);
  let rowSpan = estimateRows(article, colSpan);
  while (rowSpan > maxRows && colSpan < GRID.columns) {
    colSpan += 1;
    rowSpan = estimateRows(article, colSpan);
  }
  return { colSpan, rowSpan: Math.min(rowSpan, maxRows) };
};

import { bodyParagraphs, type Article } from '../entities/Article';
import type { Element } from '../layout/element';
import { resolveStyle } from '../layout/style';
import type { Leaf, SlotRole } from '../layout/tree';
import { detectLanguage } from './detectLanguage';
import { COLUMN_WIDTH_MM, GRID, spanWidthMm } from './PageGeometry';

const PT_MM = 25.4 / 72;

export const bodyPt = (role: SlotRole): number => (role === 'brief' ? 8.5 : 9.5);

/** Headline point size from the number of columns a story spans and its role. */
export const headlinePt = (cols: number, role: SlotRole): number => {
  const base = ({ 1: 13, 2: 17, 3: 22, 4: 28, 5: 32, 6: 38 } as Record<number, number>)[cols] ?? 17;
  switch (role) {
    case 'banner':
      return Math.min(60, base + 18);
    case 'lead':
      return base + 4;
    case 'box':
    case 'teaser':
      return Math.max(12, base - 2);
    case 'brief':
      return Math.min(base, 13);
    case 'story':
      return base;
  }
};

export const hasHero = (article: Article | undefined): boolean =>
  article?.body.some((n) => n.type === 'image') ?? false;

/** Smallest height the lead photo may shrink to. The photo grows to absorb spare height. */
export const heroMinMm = (cols: number): number =>
  Math.min(55, Math.max(28, spanWidthMm(cols) * 0.3));

const CAPTION_MM = 7;
const KICKER_MM = 5;
export const VERTICAL_PAD_MM = 3.5;
const EMPTY_SLOT_MM = 35;

/** Rough height in mm of a run of text set at `ptSize` across `widthMm`. */
const textHeightMm = (
  text: string,
  widthMm: number,
  ptSize: number,
  headline: boolean,
  heavy = false,
): number => {
  if (text.trim() === '') return 0;
  const te = detectLanguage(text) === 'te';
  const sizeMm = ptSize * PT_MM;
  // Average advance per character, measured from real renders (justified text wastes some space).
  const charW = sizeMm * (headline ? (te ? 0.6 : 0.62) : te ? 0.45 : 0.54) * (heavy ? 1.1 : 1);
  const lineH = sizeMm * (te ? 1.6 : headline ? 1.15 : 1.38);
  const charsPerLine = Math.max(4, Math.floor(widthMm / charW));
  return Math.ceil(text.length / charsPerLine) * lineH;
};

/** Height of the headline when set across `cols` columns in the tile's style. */
export const estimateHeadlineMm = (article: Article, cols: number, leaf: Leaf): number =>
  textHeightMm(
    article.headline,
    spanWidthMm(cols),
    headlinePt(cols, leaf.role),
    true,
    resolveStyle(leaf).headlineFont === 'display',
  );

/** Smallest height of the lead photo; taller when the headline is printed over it. */
export const heroMinForLeaf = (article: Article, cols: number, leaf: Leaf): number =>
  resolveStyle(leaf).headlineOverPhoto
    ? Math.max(heroMinMm(cols), estimateHeadlineMm(article, cols, leaf) + 14)
    : heroMinMm(cols);

/** Estimated height in mm of a non-story element set across `cols` columns. */
export const estimateElementMm = (element: Element, cols: number, leaf: Leaf): number => {
  const width = spanWidthMm(cols);
  switch (element.type) {
    case 'photo':
      return element.assetId
        ? width * 0.62 + (element.caption.trim() === '' ? 0 : CAPTION_MM) + 2
        : 45;
    case 'label':
      return 9;
    case 'ad':
      return 50;
    case 'text': {
      const head = textHeightMm(element.heading, width, headlinePt(cols, leaf.role), true);
      const body = element.body
        .split('\n')
        .reduce(
          (sum, p) => sum + textHeightMm(p, COLUMN_WIDTH_MM, bodyPt(leaf.role), false) + 1.2,
          0,
        );
      return VERTICAL_PAD_MM + head + (body / cols) * 1.2 + 8;
    }
  }
};

/** Estimated height in mm of a story (or element) set across `cols` columns in a tile. */
export const estimateStoryMm = (article: Article | undefined, cols: number, leaf: Leaf): number => {
  if (leaf.element) return estimateElementMm(leaf.element, cols, leaf);
  if (!article) return EMPTY_SLOT_MM;
  const style = resolveStyle(leaf);
  const width = spanWidthMm(cols);
  const images = article.body.filter((n) => n.type === 'image').length;
  const overPhoto = style.headlineOverPhoto && images > 0;

  const head = overPhoto ? 0 : estimateHeadlineMm(article, cols, leaf);
  const kicker = style.kicker.trim() === '' ? 0 : KICKER_MM;
  const sub =
    textHeightMm(article.subHeadline, width, 11, false) + (style.deckBand ? 3 : 0);
  const byline = article.byline.trim() === '' ? 0 : 5;

  const hero = images > 0 ? heroMinForLeaf(article, cols, leaf) + CAPTION_MM : 0;
  const inlineImages = Math.max(0, images - 1) * (COLUMN_WIDTH_MM * 0.66 + 12);

  const bodyMm = bodyParagraphs(article.body).reduce(
    (sum, p) => sum + textHeightMm(p, COLUMN_WIDTH_MM, bodyPt(leaf.role), false) + 1.2,
    0,
  );
  // Columns never balance perfectly and images cannot split, so keep a safety margin.
  const flow = ((bodyMm + inlineImages) / cols) * 1.2 + 6;
  return VERTICAL_PAD_MM + head + kicker + sub + byline + hero + flow;
};

/** How much a story needs: used to rank stories for the biggest slots. */
export const storyWeight = (article: Article): number =>
  bodyParagraphs(article.body).join('').length + (hasHero(article) ? 600 : 0);

export const MAX_COLS = GRID.columns;

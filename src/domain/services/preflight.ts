import type { Article } from '../entities/Article';
import type { Asset } from '../entities/Asset';
import { masterObjectsFor, type Edition } from '../entities/Edition';
import { MIN_PRINT_PPI, effectivePpi } from '../entities/ImageAdjust';
import { pageFill } from '../layout/fit';
import type { PageObject } from '../layout/objects';
import { layoutRects } from '../layout/tree';
import { GRID } from './PageGeometry';

export type PreflightSeverity = 'error' | 'warning' | 'info';

export type PreflightCode =
  | 'emptyPage'
  | 'emptyTile'
  | 'missingStory'
  | 'noHeadline'
  | 'overfull'
  | 'photoMissing'
  | 'photoNotFound'
  | 'lowResolution'
  | 'noCaption'
  | 'noCredit'
  | 'emptyText'
  | 'offPage'
  | 'shortOfBleed'
  | 'fontMissing';

/** One thing to look at before the pages go to press. */
export interface PreflightIssue {
  readonly code: PreflightCode;
  readonly severity: PreflightSeverity;
  readonly page: number;
  /** The tile or object concerned, when there is one. */
  readonly targetId?: string;
  /** Values for the message, e.g. the fill percentage or the effective ppi. */
  readonly params?: Readonly<Record<string, string | number>>;
}

export interface PreflightInput {
  readonly edition: Edition;
  readonly articles: readonly Article[];
  readonly assets: readonly Asset[];
  /** When printing with bleed, how far artwork must run past the trim edge (mm). */
  readonly bleedMm?: number;
}

const OVERFULL_WARN = 1.02;
const OVERFULL_ERROR = 1.1;

const hasText = (s: string | undefined): boolean => (s ?? '').trim() !== '';

const insidePage = (o: PageObject): boolean =>
  o.x + o.w > 0 && o.y + o.h > 0 && o.x < GRID.pageWidthMm && o.y < GRID.pageHeightMm;

const EDGE_TOLERANCE_MM = 0.5;

/** An object that runs up to a page edge should carry on past it into the bleed. */
const fallsShortOfBleed = (o: PageObject, bleed: number): boolean =>
  (Math.abs(o.x) <= EDGE_TOLERANCE_MM && o.x > -bleed) ||
  (Math.abs(o.y) <= EDGE_TOLERANCE_MM && o.y > -bleed) ||
  (Math.abs(o.x + o.w - GRID.pageWidthMm) <= EDGE_TOLERANCE_MM && o.x + o.w < GRID.pageWidthMm + bleed) ||
  (Math.abs(o.y + o.h - GRID.pageHeightMm) <= EDGE_TOLERANCE_MM && o.y + o.h < GRID.pageHeightMm + bleed);

/**
 * Checks an edition the way a production desk would before sending it to press: empty or
 * overfull pages, missing headlines, missing or soft photos, missing captions and credits,
 * and stray objects. Pure: it reads the edition and reports; it never changes anything.
 */
export const runPreflight = ({ edition, articles, assets, bleedMm = 0 }: PreflightInput): PreflightIssue[] => {
  const issues: PreflightIssue[] = [];
  const articleById = new Map(articles.map((a) => [a.id, a]));
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const lookup = (id: string) => articleById.get(id);

  const checkPhoto = (
    page: number,
    targetId: string,
    assetId: string | undefined,
    frame: { w: number; h: number },
    adjust: Parameters<typeof effectivePpi>[2],
  ) => {
    if (!assetId) {
      issues.push({ code: 'photoMissing', severity: 'error', page, targetId });
      return;
    }
    const asset = assetById.get(assetId);
    if (!asset) {
      issues.push({ code: 'photoNotFound', severity: 'error', page, targetId });
      return;
    }
    const ppi = Math.round(effectivePpi(asset, frame, adjust));
    if (ppi < MIN_PRINT_PPI) {
      issues.push({ code: 'lowResolution', severity: 'warning', page, targetId, params: { ppi } });
    }
  };

  for (const page of edition.pages) {
    const { leaves } = layoutRects(page.layout, page.number);
    const objects = [...masterObjectsFor(edition, page), ...(page.objects ?? [])];
    const filled = leaves.filter(({ leaf }) => leaf.articleId || leaf.element);

    if (filled.length === 0 && objects.length === 0) {
      issues.push({ code: 'emptyPage', severity: 'warning', page: page.number });
    }

    const fill = pageFill(page.layout, page.number, lookup);
    if (fill > OVERFULL_WARN) {
      issues.push({
        code: 'overfull',
        severity: fill > OVERFULL_ERROR ? 'error' : 'warning',
        page: page.number,
        params: { percent: Math.round(fill * 100) },
      });
    }

    for (const { leaf, rect } of leaves) {
      if (leaf.element) {
        const el = leaf.element;
        if (el.type === 'photo') {
          checkPhoto(page.number, leaf.id, el.assetId, rect, el.adjust);
          if (el.assetId && !hasText(el.caption)) {
            issues.push({ code: 'noCaption', severity: 'warning', page: page.number, targetId: leaf.id });
          }
          if (el.assetId && !hasText(el.credit)) {
            issues.push({ code: 'noCredit', severity: 'info', page: page.number, targetId: leaf.id });
          }
        }
        continue;
      }
      if (!leaf.articleId) {
        issues.push({ code: 'emptyTile', severity: 'warning', page: page.number, targetId: leaf.id });
        continue;
      }
      const article = articleById.get(leaf.articleId);
      if (!article) {
        issues.push({ code: 'missingStory', severity: 'error', page: page.number, targetId: leaf.id });
      } else if (!leaf.continuesFrom && !hasText(article.headline)) {
        issues.push({ code: 'noHeadline', severity: 'error', page: page.number, targetId: leaf.id });
      }
    }

    for (const o of page.objects ?? []) {
      if (o.hidden) continue;
      if (!insidePage(o)) {
        issues.push({ code: 'offPage', severity: 'warning', page: page.number, targetId: o.id });
      }
      if (bleedMm > 0 && fallsShortOfBleed(o, bleedMm)) {
        issues.push({ code: 'shortOfBleed', severity: 'warning', page: page.number, targetId: o.id, params: { bleed: bleedMm } });
      }
      if (o.kind === 'text' && !hasText(o.text)) {
        issues.push({ code: 'emptyText', severity: 'warning', page: page.number, targetId: o.id });
      }
      if (o.kind === 'image') checkPhoto(page.number, o.id, o.assetId, o, o.adjust);
    }
  }

  const rank = { error: 0, warning: 1, info: 2 } as const;
  return issues.sort((a, b) => a.page - b.page || rank[a.severity] - rank[b.severity]);
};

export const countBySeverity = (issues: readonly PreflightIssue[]) => ({
  error: issues.filter((i) => i.severity === 'error').length,
  warning: issues.filter((i) => i.severity === 'warning').length,
  info: issues.filter((i) => i.severity === 'info').length,
});

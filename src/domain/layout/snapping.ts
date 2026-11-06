import { COLUMN_WIDTH_MM, GRID, liveRectMm, type RectMm } from '../services/PageGeometry';
import type { PageObject } from './objects';

/** Positions (in mm) an object's edges and centre may snap to. */
export interface SnapTargets {
  readonly xs: readonly number[];
  readonly ys: readonly number[];
}

/** A guide line to draw: a vertical line at x, or a horizontal line at y. */
export interface Guide {
  readonly axis: 'x' | 'y';
  readonly at: number;
}

/**
 * Everything worth snapping to on a page: its edges and centre, the margins, every column
 * edge, and the edges and centres of the other objects. Moving objects are left out by the
 * caller so they never snap to themselves.
 */
export const snapTargets = (pageNumber: number, others: readonly PageObject[]): SnapTargets => {
  const live = liveRectMm(pageNumber);
  const columnEdges = Array.from({ length: GRID.columns }, (_, i) => {
    const left = live.x + i * (COLUMN_WIDTH_MM + GRID.gutterMm);
    return [left, left + COLUMN_WIDTH_MM];
  }).flat();

  const xs = [
    0,
    GRID.pageWidthMm / 2,
    GRID.pageWidthMm,
    live.x,
    live.x + live.w,
    ...columnEdges,
  ];
  const ys = [0, GRID.pageHeightMm / 2, GRID.pageHeightMm, live.y, live.y + live.h];

  for (const o of others) {
    if (o.hidden) continue;
    xs.push(o.x, o.x + o.w / 2, o.x + o.w);
    ys.push(o.y, o.y + o.h / 2, o.y + o.h);
  }
  return { xs, ys };
};

/** The nearest target to any candidate within `threshold`, as the shift that lands on it. */
export const snapValue = (
  candidates: readonly number[],
  targets: readonly number[],
  threshold: number,
): { delta: number; at: number } | undefined => {
  let best: { delta: number; at: number } | undefined;
  for (const candidate of candidates) {
    for (const target of targets) {
      const delta = target - candidate;
      if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
        best = { delta, at: target };
      }
    }
  }
  return best;
};

export interface SnapResult {
  readonly x: number;
  readonly y: number;
  readonly guides: readonly Guide[];
}

/** Snaps a moving rectangle by its left, centre and right (and top, middle, bottom). */
export const snapMove = (rect: RectMm, targets: SnapTargets, threshold: number): SnapResult => {
  const sx = snapValue([rect.x, rect.x + rect.w / 2, rect.x + rect.w], targets.xs, threshold);
  const sy = snapValue([rect.y, rect.y + rect.h / 2, rect.y + rect.h], targets.ys, threshold);
  const guides: Guide[] = [];
  if (sx) guides.push({ axis: 'x', at: sx.at });
  if (sy) guides.push({ axis: 'y', at: sy.at });
  return { x: rect.x + (sx?.delta ?? 0), y: rect.y + (sy?.delta ?? 0), guides };
};

/** Snaps a single dragged edge (used while resizing). */
export const snapEdge = (
  value: number,
  targets: readonly number[],
  threshold: number,
): { value: number; guide?: number } => {
  const hit = snapValue([value], targets, threshold);
  return hit ? { value: value + hit.delta, guide: hit.at } : { value };
};

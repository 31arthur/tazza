import type { Article } from '../entities/Article';
import { estimateStoryMm, hasHero } from '../services/CopyfitEstimator';
import { GRID, liveRectMm } from '../services/PageGeometry';
import type { LayoutNode } from './tree';

export type ArticleLookup = (id: string) => Article | undefined;

const articleOf = (node: LayoutNode, lookup: ArticleLookup): Article | undefined =>
  node.kind === 'leaf' && node.articleId ? lookup(node.articleId) : undefined;

/** Hero photos can grow to soak up spare height, so they get the slack first. */
const heroCount = (node: LayoutNode, lookup: ArticleLookup): number =>
  node.kind === 'leaf'
    ? hasHero(articleOf(node, lookup))
      ? 1
      : 0
    : node.children.reduce((n, c) => n + heroCount(c, lookup), 0);

/**
 * Splits `cols` columns between side-by-side stories so that the tallest one is as short as
 * possible: the story that needs the most height keeps getting the next column.
 */
export function allocateColumns(
  children: readonly LayoutNode[],
  cols: number,
  lookup: ArticleLookup,
): number[] {
  const sizes = children.map(() => 1);
  for (let spare = cols - children.length; spare > 0; spare--) {
    let neediest = 0;
    let most = -1;
    children.forEach((child, i) => {
      const need = needMm(child, sizes[i] ?? 1, lookup);
      if (need > most) {
        most = need;
        neediest = i;
      }
    });
    sizes[neediest] = (sizes[neediest] ?? 1) + 1;
  }
  return sizes;
}

/** Height in mm a node needs when it is `cols` columns wide. */
export function needMm(node: LayoutNode, cols: number, lookup: ArticleLookup): number {
  if (node.kind === 'leaf') return estimateStoryMm(articleOf(node, lookup), cols, node);
  if (node.direction === 'row') {
    const sizes = allocateColumns(node.children, cols, lookup);
    return Math.max(...node.children.map((c, i) => needMm(c, sizes[i] ?? 1, lookup)));
  }
  return node.children.reduce((sum, c) => sum + needMm(c, cols, lookup), 0);
}

/**
 * Re-fits a whole subtree to `heightMm`: columns are shared out by need, stacked stories get
 * their needed height, and spare height goes to stories with photos (or evenly).
 */
export function autoFit(
  node: LayoutNode,
  cols: number,
  heightMm: number,
  lookup: ArticleLookup,
): LayoutNode {
  if (node.kind === 'leaf') return node;

  if (node.direction === 'row') {
    const sizes = allocateColumns(node.children, cols, lookup);
    return {
      ...node,
      sizes,
      children: node.children.map((c, i) => autoFit(c, sizes[i] ?? 1, heightMm, lookup)),
    };
  }

  const needs = node.children.map((c) => needMm(c, cols, lookup));
  const total = needs.reduce((a, b) => a + b, 0);
  const slack = Math.max(0, heightMm - total);
  const heroes = node.children.map((c) => heroCount(c, lookup));
  const heroTotal = heroes.reduce((a, b) => a + b, 0);
  const sizes = needs.map((need, i) => {
    const share = heroTotal > 0 ? (heroes[i] ?? 0) / heroTotal : need / (total || 1);
    return need + slack * share;
  });
  const scale = heightMm / (sizes.reduce((a, b) => a + b, 0) || 1);
  return {
    ...node,
    sizes,
    children: node.children.map((c, i) => autoFit(c, cols, (sizes[i] ?? 0) * scale, lookup)),
  };
}

export const fitPage = (root: LayoutNode, pageNumber: number, lookup: ArticleLookup): LayoutNode =>
  autoFit(root, GRID.columns, liveRectMm(pageNumber).h, lookup);

/** How full a page is: 1 means the stories need exactly the available height. */
export const pageFill = (root: LayoutNode, pageNumber: number, lookup: ArticleLookup): number =>
  needMm(root, GRID.columns, lookup) / liveRectMm(pageNumber).h;

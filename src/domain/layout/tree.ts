import { LayoutError } from '../errors/DomainError';
import type { IdGenerator } from '../ports/services/IdGenerator';
import type { LeafStyle } from './style';
import { COLUMN_WIDTH_MM, GRID, liveRectMm, type RectMm } from '../services/PageGeometry';

/**
 * A page is a tiling: the live area is split into rows and columns of stories until every
 * rectangle holds one story. Because the tiles always cover the page, moving a story simply
 * re-divides the space and the rest of the page re-fits around it.
 */
export type SlotRole = 'banner' | 'lead' | 'story' | 'box' | 'brief' | 'teaser';
export type Direction = 'row' | 'column';
export type Edge = 'left' | 'right' | 'top' | 'bottom';

export interface Leaf {
  readonly kind: 'leaf';
  readonly id: string;
  readonly role: SlotRole;
  /** Overrides of the role's preset style (colours, frame, kicker, jump line, ...). */
  readonly style?: Partial<LeafStyle>;
  /** Template slots are filled in priority order (1 = most important). */
  readonly priority?: number;
  readonly articleId?: string;
}

export interface Split {
  readonly kind: 'split';
  readonly id: string;
  /** `row`: children sit side by side, sizes are column counts. `column`: stacked, sizes are heights. */
  readonly direction: Direction;
  readonly children: readonly LayoutNode[];
  readonly sizes: readonly number[];
}

export type LayoutNode = Leaf | Split;

export const makeLeaf = (
  id: string,
  role: SlotRole = 'story',
  articleId?: string,
  priority?: number,
): Leaf => ({
  kind: 'leaf',
  id,
  role,
  ...(articleId !== undefined && { articleId }),
  ...(priority !== undefined && { priority }),
});

export const withArticle = (leaf: Leaf, articleId: string | undefined): Leaf => {
  const { articleId: _dropped, ...rest } = leaf;
  return articleId === undefined ? rest : { ...rest, articleId };
};

export const leavesOf = (node: LayoutNode): Leaf[] =>
  node.kind === 'leaf' ? [node] : node.children.flatMap(leavesOf);

export const findLeaf = (node: LayoutNode, id: string): Leaf | undefined =>
  leavesOf(node).find((l) => l.id === id);

export const articleIdsOf = (node: LayoutNode): string[] =>
  leavesOf(node).flatMap((l) => (l.articleId ? [l.articleId] : []));

export const mapLeaves = (node: LayoutNode, fn: (leaf: Leaf) => Leaf): LayoutNode =>
  node.kind === 'leaf' ? fn(node) : { ...node, children: node.children.map((c) => mapLeaves(c, fn)) };

export const clearArticle = (node: LayoutNode, articleId: string): LayoutNode =>
  mapLeaves(node, (l) => (l.articleId === articleId ? withArticle(l, undefined) : l));

export const setLeafArticle = (
  node: LayoutNode,
  leafId: string,
  articleId: string | undefined,
): LayoutNode => mapLeaves(node, (l) => (l.id === leafId ? withArticle(l, articleId) : l));

export const setLeafRole = (node: LayoutNode, leafId: string, role: SlotRole): LayoutNode =>
  mapLeaves(node, (l) => (l.id === leafId ? { ...l, role } : l));

/** Merges style overrides into a tile; `null` resets it to its role's preset. */
export const setLeafStyle = (
  node: LayoutNode,
  leafId: string,
  style: Partial<LeafStyle> | null,
): LayoutNode =>
  mapLeaves(node, (l) => {
    if (l.id !== leafId) return l;
    const { style: _old, ...rest } = l;
    return style === null ? rest : { ...rest, style: { ..._old, ...style } };
  });

export const swapArticles = (node: LayoutNode, aId: string, bId: string): LayoutNode => {
  const a = findLeaf(node, aId)?.articleId;
  const b = findLeaf(node, bId)?.articleId;
  return mapLeaves(node, (l) =>
    l.id === aId ? withArticle(l, b) : l.id === bId ? withArticle(l, a) : l,
  );
};

/** Empty slots in the order they should be filled. */
export const emptyLeavesByPriority = (node: LayoutNode): Leaf[] =>
  leavesOf(node)
    .filter((l) => l.articleId === undefined)
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

/** Removes a tile; its space goes to a neighbour and one-child splits collapse. */
export function removeLeaf(node: LayoutNode, leafId: string): LayoutNode | undefined {
  if (node.kind === 'leaf') return node.id === leafId ? undefined : node;

  const children: LayoutNode[] = [];
  const sizes: number[] = [];
  let freed = 0;
  let freedAt = -1;
  node.children.forEach((child, i) => {
    const size = node.sizes[i] ?? 1;
    const kept = removeLeaf(child, leafId);
    if (kept) {
      children.push(kept);
      sizes.push(size);
    } else {
      freed += size;
      freedAt = children.length;
    }
  });

  if (children.length === 0) return undefined;
  if (freed > 0 && node.direction === 'row') {
    // Columns of the removed tile go to the neighbour on its left (or right if first).
    const donee = Math.max(0, freedAt - 1);
    sizes[donee] = (sizes[donee] ?? 0) + freed;
  }
  const only = children[0];
  if (children.length === 1 && only) return only;
  return { ...node, children, sizes };
}

/** Drops every empty tile; undefined when nothing is left. */
export function pruneEmpty(node: LayoutNode): LayoutNode | undefined {
  let tree: LayoutNode | undefined = node;
  for (const leaf of leavesOf(node)) {
    if (leaf.articleId === undefined && tree) tree = removeLeaf(tree, leaf.id);
  }
  return tree;
}

/** Merges nested same-direction splits and collapses splits with a single child. */
export function normalize(node: LayoutNode): LayoutNode {
  if (node.kind === 'leaf') return node;
  const children: LayoutNode[] = [];
  const sizes: number[] = [];
  node.children.forEach((raw, i) => {
    const size = node.sizes[i] ?? 1;
    const child = normalize(raw);
    if (child.kind === 'split' && child.direction === node.direction) {
      const total = child.sizes.reduce((a, b) => a + b, 0) || 1;
      const scale = node.direction === 'column' ? size / total : 1;
      child.children.forEach((g, j) => {
        children.push(g);
        sizes.push((child.sizes[j] ?? 1) * scale);
      });
    } else {
      children.push(child);
      sizes.push(size);
    }
  });
  const only = children[0];
  if (children.length === 1 && only) return only;
  return { ...node, children, sizes };
}

/** Places `newLeaf` beside `targetId`, splitting the target's space or joining its row/column. */
export function insertBeside(
  root: LayoutNode,
  targetId: string,
  newLeaf: Leaf,
  edge: Edge,
  ids: IdGenerator,
): LayoutNode {
  const wantsRow = edge === 'left' || edge === 'right';
  const before = edge === 'left' || edge === 'top';
  const direction: Direction = wantsRow ? 'row' : 'column';

  const wrap = (target: LayoutNode, cols: number): LayoutNode => {
    if (wantsRow && cols < 2) {
      throw new LayoutError('This story is only one column wide, so there is no room beside it');
    }
    const first = Math.ceil(cols / 2);
    const second = cols - first;
    const sizes = wantsRow ? (before ? [second, first] : [first, second]) : [1, 1];
    return {
      kind: 'split',
      id: ids.next(),
      direction,
      children: before ? [newLeaf, target] : [target, newLeaf],
      sizes,
    };
  };

  const visit = (node: LayoutNode, cols: number): LayoutNode => {
    if (node.kind === 'leaf') return node.id === targetId ? wrap(node, cols) : node;

    const idx = node.children.findIndex((c) => c.id === targetId);
    if (idx >= 0) {
      if (node.direction === direction) {
        const children = [...node.children];
        const sizes = [...node.sizes];
        const at = before ? idx : idx + 1;
        let newSize = sizes[idx] ?? 1;
        if (direction === 'row') {
          let donor = -1;
          let widest = 1;
          sizes.forEach((s, i) => {
            if (s > widest) {
              widest = s;
              donor = i;
            }
          });
          if (donor < 0) {
            throw new LayoutError(`This row already holds ${node.children.length} one-column stories`);
          }
          sizes[donor] = (sizes[donor] ?? 2) - 1;
          newSize = 1;
        }
        children.splice(at, 0, newLeaf);
        sizes.splice(at, 0, newSize);
        return { ...node, children, sizes };
      }
      const childCols = node.direction === 'row' ? (node.sizes[idx] ?? cols) : cols;
      return {
        ...node,
        children: node.children.map((c, i) => (i === idx ? wrap(c, childCols) : c)),
      };
    }
    return {
      ...node,
      children: node.children.map((c, i) =>
        visit(c, node.direction === 'row' ? (node.sizes[i] ?? cols) : cols),
      ),
    };
  };

  return visit(root, GRID.columns);
}

/** Adds a tile at the bottom of the page. */
export function appendBottom(root: LayoutNode, newLeaf: Leaf, ids: IdGenerator): LayoutNode {
  if (root.kind === 'split' && root.direction === 'column') {
    const avg = root.sizes.reduce((a, b) => a + b, 0) / Math.max(1, root.sizes.length);
    return { ...root, children: [...root.children, newLeaf], sizes: [...root.sizes, avg || 1] };
  }
  return {
    kind: 'split',
    id: ids.next(),
    direction: 'column',
    children: [root, newLeaf],
    sizes: [1, 1],
  };
}

/** Sets the sizes of one split (column counts for rows, relative heights for columns). */
export function resizeSplit(root: LayoutNode, splitId: string, sizes: readonly number[]): LayoutNode {
  const visit = (node: LayoutNode): LayoutNode => {
    if (node.kind === 'leaf') return node;
    if (node.id !== splitId) return { ...node, children: node.children.map(visit) };

    if (sizes.length !== node.children.length) throw new LayoutError('Wrong number of sizes');
    if (node.direction === 'row') {
      const sum = (a: readonly number[]) => a.reduce((x, y) => x + y, 0);
      if (!sizes.every((s) => Number.isInteger(s) && s >= 1) || sum(sizes) !== sum(node.sizes)) {
        throw new LayoutError('Each story needs at least one column');
      }
    } else if (!sizes.every((s) => s > 0)) {
      throw new LayoutError('Heights must be positive');
    }
    return { ...node, sizes };
  };
  return visit(root);
}

/* ---------- Geometry ---------- */

export interface PlacedLeaf {
  readonly leaf: Leaf;
  readonly rect: RectMm;
  readonly cols: number;
  /** True when the tile touches the left margin (no vertical rule needed). */
  readonly firstCol: boolean;
}

export interface DividerInfo {
  readonly splitId: string;
  /** The divider sits between children `index` and `index + 1`. */
  readonly index: number;
  readonly direction: Direction;
  /** Rectangle of the whole split the divider belongs to. */
  readonly rect: RectMm;
  /** Position of the divider along its axis in mm: x for rows, y for columns. */
  readonly position: number;
  readonly sizes: readonly number[];
  readonly cols: number;
}

export function layoutRects(
  root: LayoutNode,
  pageNumber: number,
): { leaves: PlacedLeaf[]; dividers: DividerInfo[] } {
  const leaves: PlacedLeaf[] = [];
  const dividers: DividerInfo[] = [];
  const live = liveRectMm(pageNumber);

  const walk = (node: LayoutNode, rect: RectMm, cols: number): void => {
    if (node.kind === 'leaf') {
      leaves.push({ leaf: node, rect, cols, firstCol: rect.x - live.x < 0.01 });
      return;
    }
    if (node.direction === 'row') {
      let cursor = rect.x;
      node.children.forEach((child, i) => {
        const span = node.sizes[i] ?? 1;
        const w = span * COLUMN_WIDTH_MM + (span - 1) * GRID.gutterMm;
        walk(child, { x: cursor, y: rect.y, w, h: rect.h }, span);
        cursor += w + GRID.gutterMm;
        if (i < node.children.length - 1) {
          dividers.push({
            splitId: node.id,
            index: i,
            direction: 'row',
            rect,
            position: cursor - GRID.gutterMm / 2,
            sizes: node.sizes,
            cols,
          });
        }
      });
      return;
    }
    const total = node.sizes.reduce((a, b) => a + b, 0) || 1;
    let cursor = rect.y;
    node.children.forEach((child, i) => {
      const h = ((node.sizes[i] ?? 1) / total) * rect.h;
      walk(child, { x: rect.x, y: cursor, w: rect.w, h }, cols);
      cursor += h;
      if (i < node.children.length - 1) {
        dividers.push({
          splitId: node.id,
          index: i,
          direction: 'column',
          rect,
          position: cursor,
          sizes: node.sizes,
          cols,
        });
      }
    });
  };

  walk(root, live, GRID.columns);
  return { leaves, dividers };
}

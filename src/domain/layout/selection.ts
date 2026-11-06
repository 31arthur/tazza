import {
  alignPosition,
  type AlignMode,
  type ArrangeOp,
  type ObjectPatch,
  type PageObject,
} from './objects';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** The ids to act on: those asked for, plus every other member of their groups. */
export const expandGroups = (objects: readonly PageObject[], ids: readonly string[]): string[] => {
  const wanted = new Set(ids);
  const groups = new Set(
    objects.flatMap((o) => (wanted.has(o.id) && o.groupId ? [o.groupId] : [])),
  );
  return objects
    .filter((o) => wanted.has(o.id) || (o.groupId !== undefined && groups.has(o.groupId)))
    .map((o) => o.id);
};

/** Smallest rectangle containing all the objects (rotation is ignored). */
export const boundsOf = (objects: readonly Rect[]): Rect | undefined => {
  if (objects.length === 0) return undefined;
  const left = Math.min(...objects.map((o) => o.x));
  const top = Math.min(...objects.map((o) => o.y));
  const right = Math.max(...objects.map((o) => o.x + o.w));
  const bottom = Math.max(...objects.map((o) => o.y + o.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
};

/** Visible, unlocked objects that touch the rectangle: what a marquee drag selects. */
export const objectsInRect = (objects: readonly PageObject[], rect: Rect): string[] =>
  objects
    .filter(
      (o) =>
        !o.hidden &&
        !o.locked &&
        o.x < rect.x + rect.w &&
        o.x + o.w > rect.x &&
        o.y < rect.y + rect.h &&
        o.y + o.h > rect.y,
    )
    .map((o) => o.id);

export interface IdPatch {
  readonly id: string;
  readonly patch: ObjectPatch;
}

/** What to align to: the selection's own bounds, the margins, or the page edges. */
export const ALIGN_TO = ['selection', 'live', 'page'] as const;
export type AlignTarget = (typeof ALIGN_TO)[number];

/** Patches that align every object to the reference rectangle. */
export const alignMany = (
  objects: readonly PageObject[],
  mode: AlignMode,
  reference: Rect,
): IdPatch[] => objects.map((o) => ({ id: o.id, patch: alignPosition(o, mode, reference) }));

export type DistributeAxis = 'horizontal' | 'vertical';

/** Spaces three or more objects evenly between the outermost two, which stay where they are. */
export const distributeMany = (
  objects: readonly PageObject[],
  axis: DistributeAxis,
): IdPatch[] => {
  if (objects.length < 3) return [];
  const horizontal = axis === 'horizontal';
  const start = (o: PageObject) => (horizontal ? o.x : o.y);
  const size = (o: PageObject) => (horizontal ? o.w : o.h);
  const sorted = [...objects].sort((a, b) => start(a) - start(b));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return [];
  const span = start(last) + size(last) - start(first);
  const gap = (span - sorted.reduce((sum, o) => sum + size(o), 0)) / (sorted.length - 1);

  let cursor = start(first);
  return sorted.map((o) => {
    const at = cursor;
    cursor += size(o) + gap;
    return { id: o.id, patch: horizontal ? { x: at } : { y: at } };
  });
};

/** Moves the chosen objects in the stacking order, keeping their order relative to each other. */
export const reorderMany = (
  objects: readonly PageObject[],
  ids: readonly string[],
  op: ArrangeOp,
): PageObject[] => {
  const chosen = new Set(ids);
  const list = [...objects];
  const picked = list.filter((o) => chosen.has(o.id));
  const others = list.filter((o) => !chosen.has(o.id));
  if (op === 'front') return [...others, ...picked];
  if (op === 'back') return [...picked, ...others];

  if (op === 'forward') {
    for (let i = list.length - 2; i >= 0; i--) {
      const a = list[i];
      const b = list[i + 1];
      if (a && b && chosen.has(a.id) && !chosen.has(b.id)) [list[i], list[i + 1]] = [b, a];
    }
  } else {
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1];
      const b = list[i];
      if (a && b && chosen.has(b.id) && !chosen.has(a.id)) [list[i - 1], list[i]] = [b, a];
    }
  }
  return list;
};

export const groupObjects = (
  objects: readonly PageObject[],
  ids: readonly string[],
  groupId: string,
): PageObject[] => objects.map((o) => (ids.includes(o.id) ? { ...o, groupId } : o));

export const ungroupObjects = (
  objects: readonly PageObject[],
  ids: readonly string[],
): PageObject[] =>
  objects.map((o) => {
    if (!ids.includes(o.id)) return o;
    const { groupId: _dropped, ...rest } = o;
    return rest as PageObject;
  });

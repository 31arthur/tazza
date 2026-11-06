import type { ImageAdjust } from '../entities/ImageAdjust';
import { GRID, liveRectMm } from '../services/PageGeometry';
import type { HeadlineFont, Paint } from './style';

/**
 * Free objects are placed anywhere on a page in millimetres, like shapes on a Canva canvas.
 * They sit above the tiled stories and never change how stories fit: tiles are the structure,
 * objects are stamps, arrows, labels and cut-out photos.
 */
export type ObjectKind = 'text' | 'shape' | 'image';
/** What the Insert tools can create. */
export type ObjectTool = 'text' | 'rect' | 'ellipse' | 'line' | 'image';
export const OBJECT_TOOLS: readonly ObjectTool[] = ['text', 'rect', 'ellipse', 'line', 'image'];

interface ObjectBase {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Degrees, clockwise, around the centre. */
  readonly rotation: number;
  readonly locked: boolean;
  readonly hidden: boolean;
  /** Objects sharing a group id are selected and moved together. */
  readonly groupId?: string;
}

export interface TextObject extends ObjectBase {
  readonly kind: 'text';
  readonly text: string;
  /** Point size. */
  readonly fontSize: number;
  readonly font: HeadlineFont;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly align: 'left' | 'center' | 'right';
  readonly color: Paint;
  readonly background: Paint;
}

export interface ShapeObject extends ObjectBase {
  readonly kind: 'shape';
  readonly shape: 'rect' | 'ellipse' | 'line';
  readonly fill: Paint;
  readonly stroke: Paint;
  /** Outline weight in mm (the line weight for `line`). */
  readonly strokeWidth: number;
  /** Corner radius in mm for rectangles. */
  readonly radius: number;
}

export interface ImageObject extends ObjectBase {
  readonly kind: 'image';
  readonly assetId?: string;
  readonly fit: 'cover' | 'contain';
  readonly adjust?: Partial<ImageAdjust>;
}

export type PageObject = TextObject | ShapeObject | ImageObject;

/** Fields a caller may change on any object; the kind and id never change. */
export type ObjectPatch = Partial<Omit<TextObject, 'kind' | 'id'>> &
  Partial<Omit<ShapeObject, 'kind' | 'id'>> &
  Partial<Omit<ImageObject, 'kind' | 'id'>>;

const MIN_MM = 1;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

/** Turns any angle into the range (-180, 180]. */
export const normalizeAngle = (deg: number): number => {
  const wrapped = ((((deg + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
};

/** Applies a patch with the limits every object obeys (minimum size, sane type sizes). */
export const applyObjectPatch = (object: PageObject, patch: ObjectPatch): PageObject => {
  const merged = { ...object, ...patch, id: object.id, kind: object.kind } as PageObject;
  const isLine = merged.kind === 'shape' && merged.shape === 'line';
  const base = {
    ...merged,
    x: Number.isFinite(merged.x) ? merged.x : object.x,
    y: Number.isFinite(merged.y) ? merged.y : object.y,
    w: clamp(merged.w, MIN_MM, GRID.pageWidthMm * 2),
    h: clamp(merged.h, isLine ? 0.2 : MIN_MM, GRID.pageHeightMm * 2),
    rotation: normalizeAngle(merged.rotation),
  };
  if (base.kind === 'text') return { ...base, fontSize: clamp(base.fontSize, 4, 300) };
  if (base.kind === 'shape') {
    return {
      ...base,
      strokeWidth: clamp(base.strokeWidth, 0, 20),
      radius: clamp(base.radius, 0, 100),
    };
  }
  return base;
};

/** A new object of the given type, centred in the live area of the page. */
export const createObject = (tool: ObjectTool, id: string, pageNumber: number): PageObject => {
  const live = liveRectMm(pageNumber);
  const at = (w: number, h: number) => ({
    x: live.x + (live.w - w) / 2,
    y: live.y + (live.h - h) / 2,
    w,
    h,
  });
  const base = { id, rotation: 0, locked: false, hidden: false };

  switch (tool) {
    case 'text':
      return {
        ...base,
        ...at(80, 24),
        kind: 'text',
        name: 'Text',
        text: 'Text',
        fontSize: 24,
        font: 'display',
        bold: false,
        italic: false,
        align: 'center',
        color: 'ink',
        background: 'none',
      };
    case 'rect':
      return {
        ...base,
        ...at(60, 40),
        kind: 'shape',
        name: 'Rectangle',
        shape: 'rect',
        fill: 'tint-yellow',
        stroke: 'red',
        strokeWidth: 0.5,
        radius: 0,
      };
    case 'ellipse':
      return {
        ...base,
        ...at(50, 50),
        kind: 'shape',
        name: 'Ellipse',
        shape: 'ellipse',
        fill: 'red',
        stroke: 'none',
        strokeWidth: 0,
        radius: 0,
      };
    case 'line':
      return {
        ...base,
        ...at(80, 1),
        kind: 'shape',
        name: 'Line',
        shape: 'line',
        fill: 'none',
        stroke: 'ink',
        strokeWidth: 0.8,
        radius: 0,
      };
    case 'image':
      return { ...base, ...at(80, 55), kind: 'image', name: 'Image', fit: 'cover' };
  }
};

/* ---------- Arrange ---------- */

export type ArrangeOp = 'front' | 'back' | 'forward' | 'backward';

/** Z-order is array order: the last object is on top. */
export const reorderObjects = (
  objects: readonly PageObject[],
  id: string,
  op: ArrangeOp,
): PageObject[] => {
  const index = objects.findIndex((o) => o.id === id);
  if (index < 0) return [...objects];
  const next = [...objects];
  const [moved] = next.splice(index, 1);
  if (!moved) return [...objects];
  const target =
    op === 'front'
      ? next.length
      : op === 'back'
        ? 0
        : op === 'forward'
          ? Math.min(next.length, index + 1)
          : Math.max(0, index - 1);
  next.splice(target, 0, moved);
  return next;
};

export type AlignMode = 'left' | 'centerH' | 'right' | 'top' | 'middleV' | 'bottom';
export const ALIGN_MODES: readonly AlignMode[] = [
  'left',
  'centerH',
  'right',
  'top',
  'middleV',
  'bottom',
];

/** New x or y that aligns `rect` to `reference`. */
export const alignPosition = (
  rect: { x: number; y: number; w: number; h: number },
  mode: AlignMode,
  reference: { x: number; y: number; w: number; h: number },
): Partial<{ x: number; y: number }> => {
  switch (mode) {
    case 'left':
      return { x: reference.x };
    case 'centerH':
      return { x: reference.x + (reference.w - rect.w) / 2 };
    case 'right':
      return { x: reference.x + reference.w - rect.w };
    case 'top':
      return { y: reference.y };
    case 'middleV':
      return { y: reference.y + (reference.h - rect.h) / 2 };
    case 'bottom':
      return { y: reference.y + reference.h - rect.h };
  }
};


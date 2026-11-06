import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import type { ElementKind } from '@domain/layout/element';
import type { PlacedLeaf } from '@domain/layout/tree';
import type { DropZone } from '@domain/usecases/layout/DropArticle';
import { PX_PER_MM } from '../../lib/units';

export interface DragSource {
  /** The story being dragged (absent for element tiles and new elements). */
  articleId?: string;
  /** Set when dragging a new element out of the palette. */
  elementKind?: ElementKind;
  /** Set when an already-placed tile is being moved. */
  fromLeafId?: string;
  label: string;
}

export interface DropTarget {
  leafId: string;
  zone: DropZone;
}

export interface DragState {
  source: DragSource;
  x: number;
  y: number;
  target: DropTarget | null;
}

const EDGE = 0.25;
const THRESHOLD_PX = 5;

/** Which part of a tile the pointer is over: a thin band on each edge, or the middle. */
export function zoneAt(u: number, v: number): DropZone {
  const distances: [DropZone, number][] = [
    ['left', u],
    ['right', 1 - u],
    ['top', v],
    ['bottom', 1 - v],
  ];
  const [zone, distance] = distances.reduce((a, b) => (b[1] < a[1] ? b : a));
  return distance < EDGE ? zone : 'center';
}

interface Options {
  /** The page element at real size; its on-screen box converts pointer positions to mm. */
  pageRef: RefObject<HTMLElement | null>;
  scale: number;
  leaves: readonly PlacedLeaf[];
  onDrop: (source: DragSource, target: DropTarget) => void;
}

/** Pointer-based drag and drop between the story list and the tiles of the page. */
export function useLayoutDnd({ pageRef, scale, leaves, onDrop }: Options) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const latest = useRef({ scale, leaves, onDrop });
  useEffect(() => {
    latest.current = { scale, leaves, onDrop };
  });

  const hit = useCallback(
    (clientX: number, clientY: number, source: DragSource): DropTarget | null => {
      const box = pageRef.current?.getBoundingClientRect();
      if (!box) return null;
      const k = PX_PER_MM * latest.current.scale;
      const x = (clientX - box.left) / k;
      const y = (clientY - box.top) / k;
      const found = latest.current.leaves.find(
        ({ rect }) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h,
      );
      if (!found || found.leaf.id === source.fromLeafId) return null;
      return {
        leafId: found.leaf.id,
        zone: zoneAt((x - found.rect.x) / found.rect.w, (y - found.rect.y) / found.rect.h),
      };
    },
    [pageRef],
  );

  const start = useCallback(
    (event: PointerEvent, source: DragSource) => {
      if (event.button !== 0) return;
      const startX = event.clientX;
      const startY = event.clientY;
      let active = false;

      const onMove = (e: globalThis.PointerEvent) => {
        if (!active && Math.hypot(e.clientX - startX, e.clientY - startY) < THRESHOLD_PX) return;
        if (!active) document.body.style.userSelect = 'none'; // no text selection while dragging
        active = true;
        setDrag({ source, x: e.clientX, y: e.clientY, target: hit(e.clientX, e.clientY, source) });
      };
      const finish = (e: globalThis.PointerEvent, commit: boolean) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        document.body.style.userSelect = '';
        if (!active) return;
        setDrag(null);
        const target = commit ? hit(e.clientX, e.clientY, source) : null;
        if (target) latest.current.onDrop(source, target);
      };
      const onUp = (e: globalThis.PointerEvent) => finish(e, true);
      const onCancel = (e: globalThis.PointerEvent) => finish(e, false);

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    },
    [hit],
  );

  return { drag, start };
}

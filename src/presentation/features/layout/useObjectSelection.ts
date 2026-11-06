import { useCallback, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Page } from '@domain/entities/Edition';
import type { ObjectPatch, PageObject } from '@domain/layout/objects';
import { expandGroups, objectsInRect, type Rect } from '@domain/layout/selection';
import { PX_PER_MM } from '../../lib/units';
import type { useLayoutActions } from '../queries';
import type { ObjectDraft } from './ObjectsEditor';

type Actions = ReturnType<typeof useLayoutActions>;

const MARQUEE_SLOP_PX = 3;

interface Options {
  page: Page | undefined;
  scale: number;
  pageElement: HTMLElement | null;
  actions: Actions;
}

/**
 * Everything about selecting and editing free objects on the canvas: the selection (several
 * objects, groups), the live draft while dragging, the marquee, and the keyboard shortcuts.
 */
export function useObjectSelection({ page, scale, pageElement, actions }: Options) {
  const [rawIds, setRawIds] = useState<readonly string[]>([]);
  const [draft, setDraft] = useState<ObjectDraft | undefined>();
  const [marquee, setMarquee] = useState<Rect | undefined>();

  const objects: readonly PageObject[] = page?.objects ?? [];
  // Objects that no longer exist (deleted, undone away) drop out of the selection by themselves.
  const selectedIds = rawIds.filter((id) => objects.some((o) => o.id === id));
  const selected = objects.filter((o) => selectedIds.includes(o.id));

  const select = useCallback((ids: readonly string[]) => setRawIds(ids), []);
  const clear = useCallback(() => {
    setRawIds([]);
    setDraft(undefined);
  }, []);

  /** Layers panel click: replace the selection, or with Shift add/remove a group. */
  const pick = (id: string, additive: boolean) => {
    const members = expandGroups(objects, [id]);
    if (!additive) return select(members);
    select(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => !members.includes(s))
        : [...new Set([...selectedIds, ...members])],
    );
  };

  /** Dragging on empty canvas draws a marquee and selects what it touches. */
  const startMarquee = (e: ReactPointerEvent, additive: boolean) => {
    if (e.button !== 0) return;
    const el = pageElement;
    if (!el) {
      if (!additive) clear();
      return;
    }
    const origin = el.getBoundingClientRect();
    const k = PX_PER_MM * scale;
    const point = (cx: number, cy: number) => ({ x: (cx - origin.left) / k, y: (cy - origin.top) / k });
    const from = point(e.clientX, e.clientY);
    const startPx = { x: e.clientX, y: e.clientY };
    let moved = false;

    const rectTo = (ev: PointerEvent): Rect => {
      const to = point(ev.clientX, ev.clientY);
      return {
        x: Math.min(from.x, to.x),
        y: Math.min(from.y, to.y),
        w: Math.abs(to.x - from.x),
        h: Math.abs(to.y - from.y),
      };
    };
    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - startPx.x, ev.clientY - startPx.y) < MARQUEE_SLOP_PX) {
        return;
      }
      moved = true;
      setMarquee(rectTo(ev));
    };
    const finish = (ev: PointerEvent, commit: boolean) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      setMarquee(undefined);
      if (!commit) return;
      if (!moved) {
        if (!additive) clear();
        return;
      }
      const hit = expandGroups(objects, objectsInRect(objects, rectTo(ev)));
      select(additive ? [...new Set([...selectedIds, ...hit])] : hit);
    };
    const onUp = (ev: PointerEvent) => finish(ev, true);
    const onCancel = (ev: PointerEvent) => finish(ev, false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  /**
   * Object shortcuts. Returns true when the key was used, so the page can skip its own handling.
   * Ctrl+A select all, Ctrl+G group, Ctrl+Shift+G ungroup, Ctrl+D duplicate, arrows nudge
   * (Shift: 10 mm), [ and ] reorder (Shift: to back/front), Delete removes.
   */
  const handleKey = (e: KeyboardEvent): boolean => {
    if (!page) return false;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (mod && key === 'a') {
      const all = objects.filter((o) => !o.hidden && !o.locked).map((o) => o.id);
      if (all.length === 0) return false;
      e.preventDefault();
      select(all);
      return true;
    }
    if (selected.length === 0) return false;

    if (mod && key === 'g') {
      e.preventDefault();
      void (e.shiftKey
        ? actions.ungroupObjects(page.number, selectedIds)
        : selected.length > 1 && actions.groupObjects(page.number, selectedIds));
      return true;
    }
    if (mod && key === 'd') {
      e.preventDefault();
      void actions.duplicateObjects(page.number, selectedIds).then((ids) => ids && select(ids));
      return true;
    }
    if (mod) return false;

    const step = e.shiftKey ? 10 : 1;
    const nudge: Record<string, (o: PageObject) => ObjectPatch> = {
      ArrowLeft: (o) => ({ x: o.x - step }),
      ArrowRight: (o) => ({ x: o.x + step }),
      ArrowUp: (o) => ({ y: o.y - step }),
      ArrowDown: (o) => ({ y: o.y + step }),
    };
    const move = nudge[e.key];
    if (move) {
      e.preventDefault();
      const updates = selected.filter((o) => !o.locked).map((o) => ({ id: o.id, patch: move(o) }));
      if (updates.length > 0) void actions.updateObjects(page.number, updates);
      return true;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      void actions.removeObjects(page.number, selectedIds);
      clear();
      return true;
    }
    if (e.key === ']' || e.key === '[') {
      const forward = e.key === ']';
      const op = e.shiftKey ? (forward ? 'front' : 'back') : forward ? 'forward' : 'backward';
      void actions.reorderObjects(page.number, selectedIds, op);
      return true;
    }
    return false;
  };

  return {
    selectedIds,
    selected,
    draft,
    setDraft,
    marquee,
    select,
    clear,
    pick,
    startMarquee,
    handleKey,
  };
}

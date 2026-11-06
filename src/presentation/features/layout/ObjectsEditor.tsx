import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { applyObjectPatch, type ObjectPatch, type PageObject } from '@domain/layout/objects';
import { snapEdge, snapMove, snapTargets, type Guide } from '@domain/layout/snapping';
import { PX_PER_MM } from '../../lib/units';
import { objectBox } from '../../print/ObjectsLayer';

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
type Mode = { kind: 'move' } | { kind: 'resize'; handle: Handle } | { kind: 'rotate' };

const HANDLES: Record<Handle, { left: string; top: string; cursor: string }> = {
  nw: { left: '0%', top: '0%', cursor: 'nwse-resize' },
  n: { left: '50%', top: '0%', cursor: 'ns-resize' },
  ne: { left: '100%', top: '0%', cursor: 'nesw-resize' },
  e: { left: '100%', top: '50%', cursor: 'ew-resize' },
  se: { left: '100%', top: '100%', cursor: 'nwse-resize' },
  s: { left: '50%', top: '100%', cursor: 'ns-resize' },
  sw: { left: '0%', top: '100%', cursor: 'nesw-resize' },
  w: { left: '0%', top: '50%', cursor: 'ew-resize' },
};

const GUIDE_COLOUR = '#ec008c';
const SELECT_COLOUR = '#2563eb';
const MIN_SIZE_MM = 1;
const CLICK_SLOP_PX = 3;

interface Props {
  objects: readonly PageObject[];
  pageNumber: number;
  scale: number;
  /** The real-size page element; its on-screen box converts pointer positions to millimetres. */
  pageElement: HTMLElement | null;
  selectedId: string | undefined;
  draft: { id: string; patch: ObjectPatch } | undefined;
  onSelect: (id: string | undefined) => void;
  onDraft: (draft: { id: string; patch: ObjectPatch } | undefined) => void;
  onCommit: (id: string, patch: ObjectPatch) => void;
}

/**
 * Direct manipulation of free objects: click to select, drag to move with smart-guide snapping,
 * drag a handle to resize, drag the round handle to rotate (Shift snaps to 15 degrees).
 * Hold Alt to turn snapping off. Resizing is offered for unrotated objects.
 */
export function ObjectsEditor({
  objects,
  pageNumber,
  scale,
  pageElement,
  selectedId,
  draft,
  onSelect,
  onDraft,
  onCommit,
}: Props) {
  const [guides, setGuides] = useState<readonly Guide[]>([]);
  const k = PX_PER_MM * scale;

  const begin = (e: ReactPointerEvent, object: PageObject, mode: Mode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect(object.id);
    const page = pageElement;
    if (object.locked || !page) return;

    const origin = page.getBoundingClientRect();
    const toMm = (clientX: number, clientY: number) => ({
      x: (clientX - origin.left) / k,
      y: (clientY - origin.top) / k,
    });
    const start = toMm(e.clientX, e.clientY);
    const startPx = { x: e.clientX, y: e.clientY };
    const targets = snapTargets(
      pageNumber,
      objects.filter((o) => o.id !== object.id),
    );
    const threshold = 6 / k;
    let latest: ObjectPatch | undefined;

    const onMove = (ev: PointerEvent) => {
      if (!latest && Math.hypot(ev.clientX - startPx.x, ev.clientY - startPx.y) < CLICK_SLOP_PX) {
        return;
      }
      const p = toMm(ev.clientX, ev.clientY);
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      const snapping = !ev.altKey;
      let patch: ObjectPatch;
      let lines: Guide[] = [];

      if (mode.kind === 'move') {
        const raw = { x: object.x + dx, y: object.y + dy, w: object.w, h: object.h };
        const snapped = snapping ? snapMove(raw, targets, threshold) : undefined;
        patch = { x: snapped?.x ?? raw.x, y: snapped?.y ?? raw.y };
        lines = [...(snapped?.guides ?? [])];
      } else if (mode.kind === 'resize') {
        let left = object.x;
        let top = object.y;
        let right = object.x + object.w;
        let bottom = object.y + object.h;
        const edge = (value: number, axis: 'x' | 'y') => {
          if (!snapping) return value;
          const hit = snapEdge(value, axis === 'x' ? targets.xs : targets.ys, threshold);
          if (hit.guide !== undefined) lines.push({ axis, at: hit.guide });
          return hit.value;
        };
        if (mode.handle.includes('w')) left = edge(object.x + dx, 'x');
        if (mode.handle.includes('e')) right = edge(object.x + object.w + dx, 'x');
        if (mode.handle.includes('n')) top = edge(object.y + dy, 'y');
        if (mode.handle.includes('s')) bottom = edge(object.y + object.h + dy, 'y');
        if (right - left < MIN_SIZE_MM) [left, right] = [object.x, object.x + object.w];
        if (bottom - top < MIN_SIZE_MM) [top, bottom] = [object.y, object.y + object.h];
        patch = { x: left, y: top, w: right - left, h: bottom - top };
      } else {
        const cx = object.x + object.w / 2;
        const cy = object.y + object.h / 2;
        let angle = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90;
        if (ev.shiftKey) angle = Math.round(angle / 15) * 15;
        patch = { rotation: angle };
      }

      latest = patch;
      setGuides(lines);
      onDraft({ id: object.id, patch });
    };

    const finish = (commit: boolean) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      setGuides([]);
      onDraft(undefined);
      if (commit && latest) onCommit(object.id, latest);
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  const shown = (o: PageObject) => (draft && draft.id === o.id ? applyObjectPatch(o, draft.patch) : o);
  const selected = objects.find((o) => o.id === selectedId && !o.hidden);
  const handleMm = 9 / k;
  const rotateOffsetMm = 24 / k;

  return (
    <div aria-hidden={false} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7 }}>
      {objects
        .filter((o) => !o.hidden)
        .map((o) => (
          <div
            key={o.id}
            data-object-id={o.id}
            onPointerDown={(e) => begin(e, o, { kind: 'move' })}
            style={{
              ...objectBox(shown(o)),
              pointerEvents: 'auto',
              touchAction: 'none',
              cursor: o.locked ? 'default' : 'move',
            }}
          />
        ))}

      {selected && (
        <div
          style={{
            ...objectBox(shown(selected)),
            outline: `${1.5 / k}mm solid ${SELECT_COLOUR}`,
            pointerEvents: 'none',
          }}
        >
          {!selected.locked && selected.rotation === 0 &&
            (Object.keys(HANDLES) as Handle[]).map((handle) => (
              <div
                key={handle}
                data-handle={handle}
                onPointerDown={(e) => begin(e, selected, { kind: 'resize', handle })}
                style={{
                  position: 'absolute',
                  left: HANDLES[handle].left,
                  top: HANDLES[handle].top,
                  width: `${handleMm}mm`,
                  height: `${handleMm}mm`,
                  transform: 'translate(-50%, -50%)',
                  background: '#fff',
                  border: `${1.5 / k}mm solid ${SELECT_COLOUR}`,
                  cursor: HANDLES[handle].cursor,
                  pointerEvents: 'auto',
                  touchAction: 'none',
                }}
              />
            ))}
          {!selected.locked && (
            <div
              data-handle="rotate"
              onPointerDown={(e) => begin(e, selected, { kind: 'rotate' })}
              style={{
                position: 'absolute',
                left: '50%',
                top: `${-rotateOffsetMm}mm`,
                width: `${handleMm}mm`,
                height: `${handleMm}mm`,
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: SELECT_COLOUR,
                cursor: 'grab',
                pointerEvents: 'auto',
                touchAction: 'none',
              }}
            />
          )}
        </div>
      )}

      {guides.map((g, i) => (
        <div
          key={`${g.axis}-${g.at}-${i}`}
          style={{
            position: 'absolute',
            background: GUIDE_COLOUR,
            ...(g.axis === 'x'
              ? { left: `${g.at}mm`, top: 0, bottom: 0, width: `${1 / k}mm` }
              : { top: `${g.at}mm`, left: 0, right: 0, height: `${1 / k}mm` }),
          }}
        />
      ))}
    </div>
  );
}

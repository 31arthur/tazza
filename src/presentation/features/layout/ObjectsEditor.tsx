import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { applyObjectPatch, type ObjectPatch, type PageObject } from '@domain/layout/objects';
import { boundsOf, expandGroups, type IdPatch } from '@domain/layout/selection';
import { snapEdge, snapMove, snapTargets, type Guide } from '@domain/layout/snapping';
import { PX_PER_MM } from '../../lib/units';
import { objectBox } from '../../print/ObjectsLayer';

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
type Mode = { kind: 'move' } | { kind: 'resize'; handle: Handle } | { kind: 'rotate' };
export type ObjectDraft = ReadonlyMap<string, ObjectPatch>;

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
  /** Ruler guides the designer placed; objects snap to them too. */
  customGuides: readonly Guide[];
  selectedIds: readonly string[];
  draft: ObjectDraft | undefined;
  onSelect: (ids: string[]) => void;
  onDraft: (draft: ObjectDraft | undefined) => void;
  onCommit: (updates: IdPatch[]) => void;
}

/**
 * Direct manipulation of free objects. Click selects (Shift adds or removes, and a click on a
 * grouped object selects the whole group); dragging moves everything selected with smart-guide
 * snapping; a single ungrouped object also gets eight resize handles and a rotate handle
 * (Shift snaps to 15 degrees). Hold Alt to turn snapping off.
 */
export function ObjectsEditor({
  objects,
  pageNumber,
  scale,
  pageElement,
  customGuides,
  selectedIds,
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

    if (e.shiftKey && mode.kind === 'move') {
      const members = expandGroups(objects, [object.id]);
      onSelect(
        selectedIds.includes(object.id)
          ? selectedIds.filter((id) => !members.includes(id))
          : [...new Set([...selectedIds, ...members])],
      );
      return;
    }

    const alreadySelected = selectedIds.includes(object.id);
    const selection = alreadySelected ? [...selectedIds] : expandGroups(objects, [object.id]);
    if (!alreadySelected) onSelect(selection);

    const moving = objects.filter((o) => selection.includes(o.id) && !o.locked);
    if (moving.length === 0 || !pageElement) return;
    if (mode.kind !== 'move' && moving.length !== 1) return;

    const origin = pageElement.getBoundingClientRect();
    const toMm = (clientX: number, clientY: number) => ({
      x: (clientX - origin.left) / k,
      y: (clientY - origin.top) / k,
    });
    const start = toMm(e.clientX, e.clientY);
    const startPx = { x: e.clientX, y: e.clientY };
    const targets = snapTargets(
      pageNumber,
      objects.filter((o) => !selection.includes(o.id)),
      customGuides,
    );
    const threshold = 6 / k;
    let latest: ObjectDraft | undefined;

    const onMove = (ev: PointerEvent) => {
      if (!latest && Math.hypot(ev.clientX - startPx.x, ev.clientY - startPx.y) < CLICK_SLOP_PX) {
        return;
      }
      const p = toMm(ev.clientX, ev.clientY);
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      const snapping = !ev.altKey;
      const next = new Map<string, ObjectPatch>();
      let lines: Guide[] = [];

      if (mode.kind === 'move') {
        // The whole selection moves as one block and snaps by its combined bounds.
        const bounds = boundsOf(moving);
        if (!bounds) return;
        const raw = { x: bounds.x + dx, y: bounds.y + dy, w: bounds.w, h: bounds.h };
        const snapped = snapping ? snapMove(raw, targets, threshold) : undefined;
        const shiftX = (snapped?.x ?? raw.x) - bounds.x;
        const shiftY = (snapped?.y ?? raw.y) - bounds.y;
        for (const o of moving) next.set(o.id, { x: o.x + shiftX, y: o.y + shiftY });
        lines = [...(snapped?.guides ?? [])];
      } else if (mode.kind === 'resize') {
        const o = object;
        let left = o.x;
        let top = o.y;
        let right = o.x + o.w;
        let bottom = o.y + o.h;
        const edge = (value: number, axis: 'x' | 'y') => {
          if (!snapping) return value;
          const hit = snapEdge(value, axis === 'x' ? targets.xs : targets.ys, threshold);
          if (hit.guide !== undefined) lines.push({ axis, at: hit.guide });
          return hit.value;
        };
        if (mode.handle.includes('w')) left = edge(o.x + dx, 'x');
        if (mode.handle.includes('e')) right = edge(o.x + o.w + dx, 'x');
        if (mode.handle.includes('n')) top = edge(o.y + dy, 'y');
        if (mode.handle.includes('s')) bottom = edge(o.y + o.h + dy, 'y');
        if (right - left < MIN_SIZE_MM) [left, right] = [o.x, o.x + o.w];
        if (bottom - top < MIN_SIZE_MM) [top, bottom] = [o.y, o.y + o.h];
        next.set(o.id, { x: left, y: top, w: right - left, h: bottom - top });
      } else {
        const cx = object.x + object.w / 2;
        const cy = object.y + object.h / 2;
        let angle = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90;
        if (ev.shiftKey) angle = Math.round(angle / 15) * 15;
        next.set(object.id, { rotation: angle });
      }

      latest = next;
      setGuides(lines);
      onDraft(next);
    };

    const finish = (commit: boolean) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      setGuides([]);
      onDraft(undefined);
      if (commit && latest) {
        onCommit([...latest].map(([id, patch]) => ({ id, patch })));
      }
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  const shown = (o: PageObject) => {
    const patch = draft?.get(o.id);
    return patch ? applyObjectPatch(o, patch) : o;
  };
  const chosen = objects.filter((o) => selectedIds.includes(o.id) && !o.hidden).map(shown);
  const single = chosen.length === 1 && chosen[0]?.groupId === undefined ? chosen[0] : undefined;
  const block = chosen.length > 1 || (chosen.length === 1 && !single) ? boundsOf(chosen) : undefined;
  const handleMm = 9 / k;
  const rotateOffsetMm = 24 / k;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7 }}>
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

      {/* Several objects, or a group: one dashed box around all of them. */}
      {chosen.map((o) =>
        single ? null : (
          <div
            key={`mark-${o.id}`}
            style={{
              ...objectBox(o),
              outline: `${1 / k}mm solid ${SELECT_COLOUR}`,
              pointerEvents: 'none',
            }}
          />
        ),
      )}
      {block && (
        <div
          data-selection-bounds
          style={{
            position: 'absolute',
            left: `${block.x}mm`,
            top: `${block.y}mm`,
            width: `${block.w}mm`,
            height: `${block.h}mm`,
            outline: `${1.5 / k}mm dashed ${SELECT_COLOUR}`,
            pointerEvents: 'none',
          }}
        />
      )}

      {single && (
        <div
          style={{
            ...objectBox(single),
            outline: `${1.5 / k}mm solid ${SELECT_COLOUR}`,
            pointerEvents: 'none',
          }}
        >
          {!single.locked &&
            single.rotation === 0 &&
            (Object.keys(HANDLES) as Handle[]).map((handle) => (
              <div
                key={handle}
                data-handle={handle}
                onPointerDown={(e) => begin(e, single, { kind: 'resize', handle })}
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
          {!single.locked && (
            <div
              data-handle="rotate"
              onPointerDown={(e) => begin(e, single, { kind: 'rotate' })}
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

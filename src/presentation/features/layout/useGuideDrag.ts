import { useCallback, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Guide } from '@domain/layout/snapping';
import { GRID } from '@domain/services/PageGeometry';
import { PX_PER_MM } from '../../lib/units';

export interface GuideDraft {
  readonly axis: Guide['axis'];
  readonly at: number;
  /** Which existing guide is being moved; null while a new guide is dragged out of a ruler. */
  readonly index: number | null;
  /** True while the pointer is off the page: letting go deletes (or never creates) the guide. */
  readonly off: boolean;
}

interface Options {
  pageElement: HTMLElement | null;
  scale: number;
  guides: readonly Guide[];
  onCommit: (guides: Guide[]) => void;
}

const snapHalfMm = (mm: number) => Math.round(mm * 2) / 2;

/** Drag guides out of the rulers, move them, or drag them off the page to delete them. */
export function useGuideDrag({ pageElement, scale, guides, onCommit }: Options) {
  const [draft, setDraft] = useState<GuideDraft | null>(null);

  const start = useCallback(
    (axis: Guide['axis'], index: number | null, event: ReactPointerEvent) => {
      if (event.button !== 0 || !pageElement) return;
      event.stopPropagation();
      event.preventDefault();
      const origin = pageElement.getBoundingClientRect();
      const k = PX_PER_MM * scale;
      const limit = axis === 'x' ? GRID.pageWidthMm : GRID.pageHeightMm;

      const read = (e: PointerEvent): GuideDraft => {
        const raw = axis === 'x' ? (e.clientX - origin.left) / k : (e.clientY - origin.top) / k;
        return { axis, at: snapHalfMm(raw), index, off: raw < 0 || raw > limit };
      };

      const onMove = (e: PointerEvent) => setDraft(read(e));
      const finish = (e: PointerEvent, commit: boolean) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        setDraft(null);
        if (!commit) return;
        const end = read(e);
        if (index === null) {
          if (!end.off) onCommit([...guides, { axis, at: end.at }]);
        } else if (end.off) {
          onCommit(guides.filter((_, i) => i !== index));
        } else if (guides[index]?.at !== end.at) {
          onCommit(guides.map((g, i) => (i === index ? { axis, at: end.at } : g)));
        }
      };
      const onUp = (e: PointerEvent) => finish(e, true);
      const onCancel = (e: PointerEvent) => finish(e, false);

      setDraft(read(event.nativeEvent));
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    },
    [pageElement, scale, guides, onCommit],
  );

  return { draft, start };
}

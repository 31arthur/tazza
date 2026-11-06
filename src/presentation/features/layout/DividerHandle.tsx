import { useState, type PointerEvent } from 'react';
import type { DividerInfo } from '@domain/layout/tree';
import { COLUMN_WIDTH_MM, GRID } from '@domain/services/PageGeometry';
import { PX_PER_MM } from '../../lib/units';

interface Props {
  divider: DividerInfo;
  scale: number;
  onResize: (splitId: string, sizes: readonly number[]) => void;
}

const THICKNESS_MM = 3;
const MIN_HEIGHT_MM = 20;

/** Drag handle between two neighbouring stories: moves columns (rows) or height (stacks). */
export function DividerHandle({ divider, scale, onResize }: Props) {
  const { direction, rect, position, sizes, index } = divider;
  const [offset, setOffset] = useState(0); // in mm along the divider's axis
  const [start, setStart] = useState<number | null>(null);

  const mmPerPx = 1 / (PX_PER_MM * scale);
  const columnStep = COLUMN_WIDTH_MM + GRID.gutterMm;
  const total = sizes.reduce((a, b) => a + b, 0);
  const mmPerWeight = rect.h / (total || 1);

  const proposal = (deltaMm: number): { sizes: number[]; shownMm: number } | null => {
    const next = [...sizes];
    const a = next[index] ?? 0;
    const b = next[index + 1] ?? 0;
    if (direction === 'row') {
      const cols = Math.max(1 - a, Math.min(b - 1, Math.round(deltaMm / columnStep)));
      next[index] = a + cols;
      next[index + 1] = b - cols;
      return { sizes: next, shownMm: cols * columnStep };
    }
    const minWeight = MIN_HEIGHT_MM / mmPerWeight;
    const dw = Math.max(minWeight - a, Math.min(b - minWeight, deltaMm / mmPerWeight));
    next[index] = a + dw;
    next[index + 1] = b - dw;
    return { sizes: next, shownMm: dw * mmPerWeight };
  };

  const begin = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setStart(direction === 'row' ? e.clientX : e.clientY);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (start === null) return;
    const delta = ((direction === 'row' ? e.clientX : e.clientY) - start) * mmPerPx;
    setOffset(proposal(delta)?.shownMm ?? 0);
  };
  const end = (e: PointerEvent<HTMLDivElement>, commit: boolean) => {
    if (start === null) return;
    const delta = ((direction === 'row' ? e.clientX : e.clientY) - start) * mmPerPx;
    const result = commit ? proposal(delta) : null;
    setStart(null);
    setOffset(0);
    if (result && Math.abs(result.shownMm) > 0.01) onResize(divider.splitId, result.sizes);
  };

  const style =
    direction === 'row'
      ? {
          left: `${position + offset - THICKNESS_MM / 2}mm`,
          top: `${rect.y}mm`,
          width: `${THICKNESS_MM}mm`,
          height: `${rect.h}mm`,
          cursor: 'col-resize',
        }
      : {
          left: `${rect.x}mm`,
          top: `${position + offset - THICKNESS_MM / 2}mm`,
          width: `${rect.w}mm`,
          height: `${THICKNESS_MM}mm`,
          cursor: 'row-resize',
        };

  return (
    <div
      role="separator"
      aria-orientation={direction === 'row' ? 'vertical' : 'horizontal'}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={(e) => end(e, true)}
      onPointerCancel={(e) => end(e, false)}
      style={{
        position: 'absolute',
        touchAction: 'none',
        background: start === null ? 'transparent' : 'rgba(37,99,235,0.55)',
        zIndex: 5,
        ...style,
      }}
      className="hover:!bg-blue-500/40"
    />
  );
}

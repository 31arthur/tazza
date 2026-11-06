import { useState, type PointerEvent } from 'react';
import type { Block } from '@domain/entities/Edition';
import {
  COLUMN_WIDTH_MM,
  GRID,
  placementInBounds,
  placementRectMm,
  placementsOverlap,
  type GridPlacement,
} from '@domain/services/PageGeometry';
import { PX_PER_MM } from '../../lib/units';
import { ArticleView } from '../../print/ArticleView';
import { blockBoxStyle, type RenderBlockArgs } from '../../print/PageRenderer';

interface Props extends RenderBlockArgs {
  pageNumber: number;
  siblings: readonly Block[];
  selected: boolean;
  scale: number;
  overflowText: string;
  onSelect: () => void;
  onCommit: (placement: GridPlacement) => void;
}

interface Drag {
  kind: 'move' | 'resize';
  startX: number;
  startY: number;
  draft: GridPlacement;
  valid: boolean;
}

/** A block on the layout canvas: click to select, drag to move, drag the corner to resize. */
export function EditableBlock({
  block,
  rect,
  article,
  pageNumber,
  siblings,
  selected,
  scale,
  overflowText,
  onSelect,
  onCommit,
}: Props) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [overflowing, setOverflowing] = useState(false);
  const base = block.placement;

  const evaluate = (kind: Drag['kind'], e: PointerEvent, start: Drag): Drag => {
    const mmX = (e.clientX - start.startX) / (PX_PER_MM * scale);
    const mmY = (e.clientY - start.startY) / (PX_PER_MM * scale);
    const dCols = Math.round(mmX / (COLUMN_WIDTH_MM + GRID.gutterMm));
    const dRows = Math.round(mmY / GRID.rowMm);
    const draft: GridPlacement =
      kind === 'move'
        ? { ...base, col: base.col + dCols, row: base.row + dRows }
        : { ...base, colSpan: base.colSpan + dCols, rowSpan: base.rowSpan + dRows };
    const valid =
      placementInBounds(draft, pageNumber) &&
      !siblings.some((s) => s.id !== block.id && placementsOverlap(s.placement, draft));
    return { ...start, draft, valid };
  };

  const begin = (kind: Drag['kind']) => (e: PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    onSelect();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ kind, startX: e.clientX, startY: e.clientY, draft: base, valid: true });
  };

  const move = (e: PointerEvent) => {
    if (drag) setDrag(evaluate(drag.kind, e, drag));
  };

  const end = () => {
    if (drag?.valid) {
      const d = drag.draft;
      const changed =
        d.col !== base.col || d.row !== base.row || d.colSpan !== base.colSpan || d.rowSpan !== base.rowSpan;
      if (changed) onCommit(d);
    }
    setDrag(null);
  };

  const ghost = drag ? placementRectMm(drag.draft, pageNumber) : undefined;

  return (
    <>
      <div
        onPointerDown={begin('move')}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={() => setDrag(null)}
        style={{
          ...blockBoxStyle(rect),
          borderBottom: '0.2mm solid #888',
          paddingBottom: '1.5mm',
          cursor: drag?.kind === 'move' ? 'grabbing' : 'grab',
          outline: selected ? '0.7mm solid #2563eb' : '0.2mm dashed #94a3b8',
          outlineOffset: '-0.2mm',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        {article && (
          <ArticleView
            article={article}
            colSpan={base.colSpan}
            onOverflowChange={setOverflowing}
          />
        )}
        {overflowing && (
          <div
            role="alert"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: '#dc2626',
              color: '#fff',
              fontFamily: 'var(--font-ui)',
              fontSize: '8pt',
              padding: '0.5mm 1.5mm',
            }}
          >
            {overflowText}
          </div>
        )}
        {selected && (
          <div
            onPointerDown={begin('resize')}
            onPointerMove={(e) => {
              e.stopPropagation();
              move(e);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              end();
            }}
            onPointerCancel={(e) => {
              e.stopPropagation();
              setDrag(null);
            }}
            aria-label="Resize"
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: '5mm',
              height: '5mm',
              background: '#2563eb',
              cursor: 'nwse-resize',
            }}
          />
        )}
      </div>
      {ghost && drag && (
        <div
          style={{
            ...blockBoxStyle(ghost),
            background: drag.valid ? 'rgba(37,99,235,0.12)' : 'rgba(220,38,38,0.18)',
            border: `0.5mm dashed ${drag.valid ? '#2563eb' : '#dc2626'}`,
            pointerEvents: 'none',
          }}
        />
      )}
    </>
  );
}

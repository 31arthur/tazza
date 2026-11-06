import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Guide } from '@domain/layout/snapping';
import { GRID } from '@domain/services/PageGeometry';
import { PX_PER_MM } from '../../lib/units';
import type { GuideDraft } from './useGuideDrag';

export const RULER_PX = 18;
const GUIDE_COLOUR = '#00a3c4';

interface RulerProps {
  /** `x`: the ruler across the top (horizontal positions); `y`: down the left side. */
  axis: 'x' | 'y';
  scale: number;
  onStartGuide: (axis: Guide['axis'], event: ReactPointerEvent) => void;
}

/** A millimetre ruler. Drag from it onto the page to pull out a guide line. */
export function Ruler({ axis, scale, onStartGuide }: RulerProps) {
  const k = PX_PER_MM * scale;
  const lengthMm = axis === 'x' ? GRID.pageWidthMm : GRID.pageHeightMm;
  const lengthPx = lengthMm * k;
  const ticks = Array.from({ length: Math.floor(lengthMm / 5) + 1 }, (_, i) => i * 5);

  return (
    <svg
      role="presentation"
      width={axis === 'x' ? lengthPx : RULER_PX}
      height={axis === 'x' ? RULER_PX : lengthPx}
      // The top ruler pulls out horizontal guides, the side ruler vertical ones.
      onPointerDown={(e) => onStartGuide(axis === 'x' ? 'y' : 'x', e)}
      style={{
        position: 'absolute',
        left: axis === 'x' ? RULER_PX : 0,
        top: axis === 'x' ? 0 : RULER_PX,
        background: '#f5f5f5',
        borderBottom: axis === 'x' ? '1px solid #bbb' : undefined,
        borderRight: axis === 'y' ? '1px solid #bbb' : undefined,
        cursor: axis === 'x' ? 'row-resize' : 'col-resize',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {ticks.map((mm) => {
        const major = mm % 50 === 0;
        const medium = mm % 10 === 0;
        const size = major ? 12 : medium ? 8 : 4;
        const pos = mm * k;
        return (
          <g key={mm}>
            <line
              x1={axis === 'x' ? pos : RULER_PX - size}
              x2={axis === 'x' ? pos : RULER_PX}
              y1={axis === 'x' ? RULER_PX - size : pos}
              y2={axis === 'x' ? RULER_PX : pos}
              stroke="#888"
              strokeWidth={1}
            />
            {major && (
              <text
                x={axis === 'x' ? pos + 2 : 2}
                y={axis === 'x' ? 9 : pos - 2}
                fontSize={8}
                fill="#555"
                transform={axis === 'y' ? `rotate(-90 2 ${pos - 2})` : undefined}
              >
                {mm}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

interface GuidesLayerProps {
  guides: readonly Guide[];
  draft: GuideDraft | null;
  scale: number;
  onStartGuide: (axis: Guide['axis'], index: number, event: ReactPointerEvent) => void;
}

/** Ruler guides over the page (editor only, never printed). Drag one to move it. */
export function GuidesLayer({ guides, draft, scale, onStartGuide }: GuidesLayerProps) {
  const k = PX_PER_MM * scale;
  const hit = 6 / k; // a 6 px wide grab area, in mm

  const shown = guides.map((g, i) => (draft && draft.index === i ? { ...g, at: draft.at } : g));
  const lines = [
    ...shown.map((g, i) => ({ g, index: i as number | null })),
    ...(draft && draft.index === null && !draft.off
      ? [{ g: { axis: draft.axis, at: draft.at }, index: null }]
      : []),
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8 }}>
      {lines.map(({ g, index }, n) => {
        if (index !== null && draft?.index === index && draft.off) return null;
        const vertical = g.axis === 'x';
        return (
          <div
            key={`${g.axis}-${index ?? 'new'}-${n}`}
            data-guide={g.axis}
            onPointerDown={index === null ? undefined : (e) => onStartGuide(g.axis, index, e)}
            style={{
              position: 'absolute',
              pointerEvents: index === null ? 'none' : 'auto',
              cursor: vertical ? 'col-resize' : 'row-resize',
              touchAction: 'none',
              ...(vertical
                ? { left: `${g.at - hit / 2}mm`, top: 0, bottom: 0, width: `${hit}mm` }
                : { top: `${g.at - hit / 2}mm`, left: 0, right: 0, height: `${hit}mm` }),
            }}
          >
            <div
              style={{
                position: 'absolute',
                background: GUIDE_COLOUR,
                ...(vertical
                  ? { left: '50%', top: 0, bottom: 0, width: `${1 / k}mm` }
                  : { top: '50%', left: 0, right: 0, height: `${1 / k}mm` }),
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

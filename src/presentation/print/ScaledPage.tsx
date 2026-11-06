import type { ReactNode } from 'react';
import { GRID } from '@domain/services/PageGeometry';
import { PX_PER_MM } from '../lib/units';

/**
 * Shows a real-size A3 page at screen scale. In print the scale is removed (see globals.css),
 * so the page prints at exactly 297 x 420 mm.
 */
export function ScaledPage({ scale, children }: { scale: number; children: ReactNode }) {
  return (
    <div
      className="page-slot bg-white shadow-md"
      style={{
        width: GRID.pageWidthMm * PX_PER_MM * scale,
        height: GRID.pageHeightMm * PX_PER_MM * scale,
        overflow: 'hidden',
      }}
    >
      <div
        className="page-scale"
        style={{
          width: `${GRID.pageWidthMm}mm`,
          height: `${GRID.pageHeightMm}mm`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
}

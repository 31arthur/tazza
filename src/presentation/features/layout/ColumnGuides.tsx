import { COLUMN_WIDTH_MM, GRID, liveRectMm } from '@domain/services/PageGeometry';

/** Print-style guides over the page: the six columns (cyan) and the live area (magenta). */
export function ColumnGuides({ pageNumber }: { pageNumber: number }) {
  const live = liveRectMm(pageNumber);
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
      {Array.from({ length: GRID.columns }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${live.x + i * (COLUMN_WIDTH_MM + GRID.gutterMm)}mm`,
            top: `${live.y}mm`,
            width: `${COLUMN_WIDTH_MM}mm`,
            height: `${live.h}mm`,
            background: 'rgba(0,174,239,0.08)',
            borderLeft: '0.2mm solid rgba(0,174,239,0.7)',
            borderRight: '0.2mm solid rgba(0,174,239,0.7)',
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          left: `${live.x}mm`,
          top: `${live.y}mm`,
          width: `${live.w}mm`,
          height: `${live.h}mm`,
          border: '0.25mm solid rgba(236,0,140,0.8)',
        }}
      />
    </div>
  );
}

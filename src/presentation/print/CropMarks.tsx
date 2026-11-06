import type { CSSProperties } from 'react';

/** Space around the trimmed page for marks and the slug line, in millimetres. */
export const SLUG_MM = 10;
const OFFSET_MM = 3; // marks stay clear of the page edge so they never print on the paper
const LENGTH_MM = 5;

const line = (style: CSSProperties): CSSProperties => ({
  position: 'absolute',
  background: '#000',
  ...style,
});

/**
 * Trim marks at the four corners of the page, drawn in the slug around it, plus a slug line.
 * Printed only; the page itself sits at (SLUG_MM, SLUG_MM) inside the sheet.
 */
export function CropMarks({ widthMm, heightMm, label }: { widthMm: number; heightMm: number; label: string }) {
  const left = SLUG_MM;
  const top = SLUG_MM;
  const right = SLUG_MM + widthMm;
  const bottom = SLUG_MM + heightMm;
  const thin = '0.1mm';
  const marks: CSSProperties[] = [];
  for (const y of [top, bottom]) {
    marks.push(line({ top: `${y}mm`, left: `${left - OFFSET_MM - LENGTH_MM}mm`, width: `${LENGTH_MM}mm`, height: thin }));
    marks.push(line({ top: `${y}mm`, left: `${right + OFFSET_MM}mm`, width: `${LENGTH_MM}mm`, height: thin }));
  }
  for (const x of [left, right]) {
    marks.push(line({ left: `${x}mm`, top: `${top - OFFSET_MM - LENGTH_MM}mm`, height: `${LENGTH_MM}mm`, width: thin }));
    marks.push(line({ left: `${x}mm`, top: `${bottom + OFFSET_MM}mm`, height: `${LENGTH_MM}mm`, width: thin }));
  }
  return (
    <div className="crop-marks hidden print:block" aria-hidden>
      {marks.map((style, i) => (
        <span key={i} style={style} />
      ))}
      <span
        style={{
          position: 'absolute',
          left: `${left}mm`,
          top: `${bottom + 4}mm`,
          fontSize: '2.5mm',
          fontFamily: 'sans-serif',
          color: '#000',
        }}
      >
        {label}
      </span>
    </div>
  );
}

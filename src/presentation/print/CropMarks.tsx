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

/** Bleed carried past each trim edge when trim marks are on, in millimetres. */
export const BLEED_MM = 3;

const SHEET_W = 297 + 2 * SLUG_MM;
const SHEET_H = 420 + 2 * SLUG_MM;

/**
 * Print rules that turn each page into a larger sheet with room for trim marks, and let artwork
 * that runs past the page edge show up to the bleed distance (everything further out is cut).
 */
export const printSheetCss = `@media print {
  @page { size: ${SHEET_W}mm ${SHEET_H}mm; margin: 0; }
  .page-fig { position: relative; width: ${SHEET_W}mm; height: ${SHEET_H}mm; }
  .page-fig .page-slot { position: absolute; left: ${SLUG_MM}mm; top: ${SLUG_MM}mm; overflow: visible !important; clip-path: inset(-${BLEED_MM}mm); }
  .page-fig .paper { overflow: visible !important; }
}`;

import { GRID, headerHeightMm } from '@domain/services/PageGeometry';

const parseIsoDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

const fmt = (locale: string, date: Date) =>
  new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

const base = {
  position: 'absolute',
  left: `${GRID.marginXMm}mm`,
  width: `${GRID.pageWidthMm - 2 * GRID.marginXMm}mm`,
} as const;

/** Page 1 masthead: publication name and the edition date in Telugu and English. */
export function Masthead({ editionId }: { editionId: string }) {
  const date = parseIsoDate(editionId);
  return (
    <header
      style={{
        ...base,
        top: `${GRID.marginTopMm}mm`,
        height: `${headerHeightMm(1) - 3}mm`,
        borderBottom: '0.8mm double #111',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          lang="te"
          className="headline"
          style={{ fontSize: '40pt', lineHeight: 1.25, letterSpacing: 0 }}
        >
          తాజా
        </div>
        <div
          lang="en"
          style={{
            fontFamily: 'var(--font-head)',
            fontSize: '11pt',
            fontWeight: 700,
            letterSpacing: '0.5em',
            marginTop: '-1mm',
          }}
        >
          TAZZA
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '0.3mm solid #111',
          padding: '1mm 0',
          fontSize: '8.5pt',
          fontFamily: 'var(--font-ui)',
        }}
      >
        <span lang="en">{fmt('en-IN', date)}</span>
        <span lang="te">{fmt('te-IN', date)}</span>
      </div>
    </header>
  );
}

export function RunningHeader({ editionId }: { editionId: string }) {
  const date = parseIsoDate(editionId);
  return (
    <header
      style={{
        ...base,
        top: `${GRID.marginTopMm}mm`,
        height: `${headerHeightMm(2) - 3}mm`,
        borderBottom: '0.3mm solid #111',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '8pt',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <strong lang="te">తాజా · TAZZA</strong>
      <span lang="en">{fmt('en-IN', date)}</span>
    </header>
  );
}

export function Folio({ pageNumber }: { pageNumber: number }) {
  return (
    <footer
      style={{
        ...base,
        bottom: '4mm',
        textAlign: 'center',
        fontSize: '8pt',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {pageNumber}
    </footer>
  );
}

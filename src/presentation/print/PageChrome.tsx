import type { ReactNode } from 'react';
import { PALETTE, TINTS, type Masthead as MastheadSettings } from '@domain/layout/style';
import { detectLanguage } from '@domain/services/detectLanguage';
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

/** A small box beside the logo: the first line is a bold red headline, the rest is small text. */
function Ear({ text }: { text: string }) {
  const [first = '', ...rest] = text.split('\n');
  return (
    <div
      style={{
        width: '62mm',
        height: '24mm',
        boxSizing: 'border-box',
        overflow: 'hidden',
        border: '0.3mm solid #c8102e',
        background: TINTS.yellow,
        padding: '1.2mm 2mm',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div
        lang={detectLanguage(first)}
        style={{ fontSize: '10pt', fontWeight: 800, color: PALETTE.red, lineHeight: 1.3 }}
      >
        {first}
      </div>
      <div lang={detectLanguage(rest.join(' '))} style={{ fontSize: '7.5pt', lineHeight: 1.35 }}>
        {rest.join(' ')}
      </div>
    </div>
  );
}

/** Page 1 masthead: top strip, logo with ears, and the edition date in Telugu and English. */
export function Masthead({
  editionId,
  settings,
}: {
  editionId: string;
  settings: MastheadSettings;
}) {
  const date = parseIsoDate(editionId);
  const color = PALETTE[settings.color];
  const slot = (content: ReactNode) => (
    <div style={{ width: '62mm', display: 'flex', justifyContent: 'center' }}>{content}</div>
  );
  return (
    <header
      style={{
        ...base,
        top: `${GRID.marginTopMm}mm`,
        height: `${headerHeightMm(1) - 3}mm`,
        borderBottom: '0.8mm solid #111',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div
        lang={detectLanguage(settings.topStrip)}
        style={{
          fontSize: '6.5pt',
          fontFamily: 'var(--font-ui)',
          color: '#444',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minHeight: '3mm',
        }}
      >
        {settings.topStrip}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {slot(settings.leftEar.trim() !== '' && <Ear text={settings.leftEar} />)}
        <div style={{ textAlign: 'center', lineHeight: 1 }}>
          <div
            lang={detectLanguage(settings.title)}
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 900,
              fontSize: '50pt',
              lineHeight: 1.15,
              color,
            }}
          >
            {settings.title}
          </div>
          <div
            lang="en"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '9pt',
              fontWeight: 800,
              letterSpacing: '0.6em',
              color: PALETTE.red,
            }}
          >
            {settings.titleEn}
          </div>
          <div
            lang={detectLanguage(settings.tagline)}
            style={{ fontSize: '7pt', fontFamily: 'var(--font-ui)', marginTop: '0.8mm', color: '#444' }}
          >
            {settings.tagline}
          </div>
        </div>
        {slot(settings.rightEar.trim() !== '' && <Ear text={settings.rightEar} />)}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '0.3mm solid #111',
          padding: '1mm 0',
          fontSize: '8.5pt',
          fontFamily: 'var(--font-ui)',
          fontWeight: 600,
        }}
      >
        <span lang="en">{fmt('en-IN', date)}</span>
        <span lang="te">{fmt('te-IN', date)}</span>
      </div>
    </header>
  );
}

export function RunningHeader({
  editionId,
  settings,
}: {
  editionId: string;
  settings: MastheadSettings;
}) {
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
      <strong lang={detectLanguage(settings.title)} style={{ color: PALETTE[settings.color] }}>
        {settings.title} · {settings.titleEn}
      </strong>
      <span lang="en">{fmt('en-IN', date)}</span>
    </header>
  );
}

const MARKS = ['#00aeef', '#ec008c', '#fff200', '#000000', '#555555', '#aaaaaa'];

/** Folio plus the colour-registration strip printers use to line up the plates. */
export function Folio({ pageNumber, printMarks }: { pageNumber: number; printMarks: boolean }) {
  return (
    <>
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
      {printMarks && (
        <div
          aria-hidden
          style={{ ...base, bottom: '1mm', display: 'flex', justifyContent: 'space-between' }}
        >
          {[0, 1].map((side) => (
            <div key={side} style={{ display: 'flex' }}>
              {MARKS.map((c) => (
                <span
                  key={c}
                  style={{ width: '4mm', height: '1.6mm', background: c, display: 'inline-block' }}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

import type { CSSProperties } from 'react';
import { detectLanguage } from '@domain/services/detectLanguage';

/** A photo caption with the photographer's credit after it, e.g. "Crowds gather (Ravi Kumar)". */
export function PhotoCaption({
  caption,
  credit,
  style,
}: {
  caption: string;
  credit?: string | undefined;
  style?: CSSProperties;
}) {
  const text = caption.trim();
  const by = (credit ?? '').trim();
  if (text === '' && by === '') return null;
  return (
    <figcaption
      lang={detectLanguage(`${text} ${by}`)}
      style={{ fontSize: '7pt', fontStyle: 'italic', color: '#333', marginTop: '0.6mm', ...style }}
    >
      {text}
      {by !== '' && (
        <span style={{ fontStyle: 'normal', fontWeight: 700, marginLeft: text === '' ? 0 : '1mm' }}>
          ({by})
        </span>
      )}
    </figcaption>
  );
}

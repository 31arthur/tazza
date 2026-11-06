import type { Element } from '@domain/layout/element';
import { PALETTE, RULE_MM, resolveStyle } from '@domain/layout/style';
import type { Leaf } from '@domain/layout/tree';
import { bodyPt, headlinePt } from '@domain/services/CopyfitEstimator';
import { detectLanguage } from '@domain/services/detectLanguage';
import { AssetImage } from './AssetImage';
import { PhotoCaption } from './PhotoCaption';

interface Props {
  element: Element;
  cols: number;
  leaf: Leaf;
}

const hatched =
  'repeating-linear-gradient(135deg, #f4f4f4 0 3mm, #e6e6e6 3mm 6mm)';

/** Draws a non-story tile: photo box, text box or sidebar, section label strip, ad placeholder. */
export function ElementView({ element, cols, leaf }: Props) {
  const look = resolveStyle(leaf);
  const accent = PALETTE[look.accent];

  switch (element.type) {
    case 'photo':
      return (
        <figure style={{ margin: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden', background: hatched }}>
            {element.assetId && (
              <AssetImage
                assetId={element.assetId}
                adjust={element.adjust}
                style={{ width: '100%', height: '100%' }}
              />
            )}
          </div>
          <PhotoCaption caption={element.caption} credit={element.credit} style={{ flex: 'none' }} />
        </figure>
      );

    case 'label':
      return (
        <div
          lang={detectLanguage(element.text)}
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: accent,
            color: '#fff',
            fontFamily: 'var(--font-ui)',
            fontWeight: 800,
            fontSize: '11pt',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {element.text}
        </div>
      );

    case 'ad':
      return (
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: hatched,
            border: `${RULE_MM.standard}mm dashed #999`,
            color: '#666',
            fontFamily: 'var(--font-ui)',
            fontSize: '8pt',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          <strong>Advertisement</strong>
          {element.note.trim() !== '' && (
            <span lang={detectLanguage(element.note)} style={{ letterSpacing: 0, textTransform: 'none' }}>
              {element.note}
            </span>
          )}
        </div>
      );

    case 'text':
      return (
        <div style={{ height: '100%', overflow: 'hidden' }}>
          {element.heading.trim() !== '' && (
            <h2
              className="headline"
              lang={detectLanguage(element.heading)}
              style={{
                margin: '0 0 1.2mm',
                fontSize: `${headlinePt(cols, leaf.role)}pt`,
                color: look.headlineColor === 'accent' ? accent : PALETTE.ink,
              }}
            >
              {element.heading}
            </h2>
          )}
          <div
            style={{
              columnCount: cols,
              columnGap: '4mm',
              columnFill: 'balance',
              columnRule: `${RULE_MM.hairline}mm solid #aaa`,
              fontSize: `${bodyPt(leaf.role)}pt`,
              textAlign: 'justify',
            }}
          >
            {element.body.split('\n').map((line, i) =>
              line.trim() === '' ? null : (
                <p
                  key={i}
                  lang={detectLanguage(line)}
                  style={{ margin: 0, textIndent: i > 0 ? '3mm' : 0 }}
                >
                  {line}
                </p>
              ),
            )}
          </div>
        </div>
      );
  }
}

import type { CSSProperties } from 'react';
import { applyObjectPatch, type ObjectPatch, type PageObject } from '@domain/layout/objects';
import { paintColor, type HeadlineFont } from '@domain/layout/style';
import { detectLanguage } from '@domain/services/detectLanguage';
import { AssetImage } from './AssetImage';

const FONT: Record<HeadlineFont, CSSProperties> = {
  serif: { fontFamily: 'var(--font-head)', fontWeight: 700 },
  sans: { fontFamily: 'var(--font-ui)', fontWeight: 800 },
  display: { fontFamily: 'var(--font-ui)', fontWeight: 900 },
};

/** Position and rotation shared by every object, in millimetres. */
export const objectBox = (o: PageObject): CSSProperties => ({
  position: 'absolute',
  left: `${o.x}mm`,
  top: `${o.y}mm`,
  width: `${o.w}mm`,
  height: `${o.h}mm`,
  boxSizing: 'border-box',
  transform: o.rotation === 0 ? undefined : `rotate(${o.rotation}deg)`,
  transformOrigin: 'center',
});

function ObjectView({ object: o }: { object: PageObject }) {
  switch (o.kind) {
    case 'text':
      return (
        <div
          lang={detectLanguage(o.text)}
          style={{
            ...objectBox(o),
            ...FONT[o.font],
            ...(!o.bold && o.font !== 'display' && { fontWeight: 400 }),
            fontStyle: o.italic ? 'italic' : 'normal',
            fontSize: `${o.fontSize}pt`,
            lineHeight: 1.25,
            textAlign: o.align,
            color: paintColor(o.color),
            background: paintColor(o.background),
            padding: '1mm',
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: o.align === 'left' ? 'flex-start' : o.align === 'right' ? 'flex-end' : 'center',
          }}
        >
          <span>{o.text}</span>
        </div>
      );

    case 'shape': {
      const stroke = paintColor(o.stroke);
      if (o.shape === 'line') {
        return (
          <div style={objectBox(o)}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '50%',
                height: `${o.strokeWidth}mm`,
                transform: 'translateY(-50%)',
                background: stroke ?? '#111',
              }}
            />
          </div>
        );
      }
      return (
        <div
          style={{
            ...objectBox(o),
            background: paintColor(o.fill),
            border: stroke && o.strokeWidth > 0 ? `${o.strokeWidth}mm solid ${stroke}` : undefined,
            borderRadius: o.shape === 'ellipse' ? '50%' : `${o.radius}mm`,
          }}
        />
      );
    }

    case 'image':
      return (
        <div style={{ ...objectBox(o), overflow: 'hidden', background: o.assetId ? undefined : '#ececec' }}>
          {o.assetId && (
            <AssetImage
              assetId={o.assetId}
              adjust={o.adjust}
              fit={o.fit}
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </div>
      );
  }
}

interface Props {
  objects: readonly PageObject[];
  /** Live, not yet saved changes made while dragging; the saved objects are untouched. */
  draft?: ReadonlyMap<string, ObjectPatch> | undefined;
}

/** Free objects, bottom to top, drawn above the tiles. Hidden objects are not drawn. */
export function ObjectsLayer({ objects, draft }: Props) {
  return (
    <>
      {objects
        .filter((o) => !o.hidden)
        .map((o) => {
          const patch = draft?.get(o.id);
          return <ObjectView key={o.id} object={patch ? applyObjectPatch(o, patch) : o} />;
        })}
    </>
  );
}

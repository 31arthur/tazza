import type { CSSProperties, HTMLAttributes } from 'react';
import type { PlacedLeaf } from '@domain/layout/tree';
import { GRID } from '@domain/services/PageGeometry';

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  placed: PlacedLeaf;
  style?: CSSProperties;
}

/** The box a story sits in: positioned on the page, with newspaper rules between stories. */
export function LeafFrame({ placed, style, children, ...rest }: Props) {
  const { rect, leaf, firstCol } = placed;
  const boxed = leaf.role === 'box';
  return (
    <div
      {...rest}
      style={{
        position: 'absolute',
        left: `${rect.x}mm`,
        top: `${rect.y}mm`,
        width: `${rect.w}mm`,
        height: `${rect.h}mm`,
        boxSizing: 'border-box',
        padding: boxed ? '2mm' : '1.5mm 0 2mm',
        borderBottom: boxed ? undefined : '0.3mm solid #222',
        ...(boxed && { background: '#eef2ff', border: '0.3mm solid #1d4ed8' }),
        ...style,
      }}
    >
      {!firstCol && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: `${-GRID.gutterMm / 2}mm`,
            top: 0,
            bottom: 0,
            width: '0.2mm',
            background: '#999',
          }}
        />
      )}
      {children}
    </div>
  );
}

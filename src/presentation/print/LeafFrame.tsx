import type { CSSProperties, HTMLAttributes } from 'react';
import { PALETTE, RULE_MM, TINTS, resolveStyle } from '@domain/layout/style';
import type { PlacedLeaf } from '@domain/layout/tree';
import { GRID } from '@domain/services/PageGeometry';

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  placed: PlacedLeaf;
  style?: CSSProperties;
}

/**
 * The box a story sits in: positioned on the page, with the rules, outline and tint its
 * style asks for. Rules between stories use the fixed weights of the house style.
 */
export function LeafFrame({ placed, style, children, ...rest }: Props) {
  const { rect, leaf, firstCol } = placed;
  const look = resolveStyle(leaf);
  const accent = PALETTE[look.accent];
  const boxed = look.frame === 'box';
  const tint = look.tint === 'none' ? undefined : TINTS[look.tint];
  const bottomRule = leaf.role === 'banner' ? RULE_MM.heavy : RULE_MM.standard;

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
        background: tint,
        ...(boxed && { border: `${RULE_MM.standard}mm solid ${accent}` }),
        ...(look.frame === 'rule' && { borderBottom: `${bottomRule}mm solid ${PALETTE.ink}` }),
        ...style,
      }}
    >
      {!firstCol && !boxed && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: `${-GRID.gutterMm / 2}mm`,
            top: 0,
            bottom: 0,
            width: `${RULE_MM.hairline}mm`,
            background: '#8a8a8a',
          }}
        />
      )}
      {children}
    </div>
  );
}

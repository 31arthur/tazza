import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { inlineText, type Article, type BodyNode } from '@domain/entities/Article';
import { PALETTE, RULE_MM, resolveStyle, type HeadlineFont } from '@domain/layout/style';
import type { Leaf } from '@domain/layout/tree';
import { bodyPt, headlinePt, heroMinForLeaf } from '@domain/services/CopyfitEstimator';
import { detectLanguage } from '@domain/services/detectLanguage';
import { spanWidthMm } from '@domain/services/PageGeometry';
import { AssetImage } from './AssetImage';
import { Inlines } from './Inlines';

interface Props {
  article: Article;
  /** Number of page columns the story spans. */
  cols: number;
  /** The tile the story sits in; its role and style decide the look. */
  leaf: Leaf;
  /** When given, called whenever the story starts or stops overflowing its tile. */
  onOverflowChange?: ((overflowing: boolean) => void) | undefined;
}

const HEADLINE_FONT: Record<HeadlineFont, CSSProperties> = {
  serif: { fontFamily: 'var(--font-head)', fontWeight: 700 },
  sans: { fontFamily: 'var(--font-ui)', fontWeight: 800 },
  display: { fontFamily: 'var(--font-ui)', fontWeight: 900, letterSpacing: '-0.01em' },
};

const DECK_BAND = '#ffe94d';

function Node({
  node,
  index,
  dateline,
  accent,
}: {
  node: BodyNode;
  index: number;
  dateline: string;
  accent: string;
}): ReactNode {
  switch (node.type) {
    case 'paragraph': {
      const text = inlineText(node.children);
      if (text.trim() === '') return null;
      return (
        <p lang={detectLanguage(text)} style={{ margin: 0, textIndent: index > 0 ? '3mm' : 0 }}>
          {dateline !== '' && (
            <strong style={{ color: accent, fontWeight: 800 }}>{dateline} </strong>
          )}
          <Inlines runs={node.children} />
        </p>
      );
    }
    case 'subhead': {
      const text = inlineText(node.children);
      return (
        <h3
          lang={detectLanguage(text)}
          style={{
            margin: '2mm 0 1mm',
            fontFamily: 'var(--font-head)',
            fontSize: '11pt',
            fontWeight: 700,
            color: accent,
            breakAfter: 'avoid',
          }}
        >
          <Inlines runs={node.children} />
        </h3>
      );
    }
    case 'pullquote': {
      const text = inlineText(node.children);
      return (
        <blockquote
          lang={detectLanguage(text)}
          style={{
            margin: '2mm 0',
            padding: '1.5mm 0',
            borderTop: `${RULE_MM.standard}mm solid ${accent}`,
            borderBottom: `${RULE_MM.standard}mm solid ${accent}`,
            fontSize: '12pt',
            fontStyle: 'italic',
            fontWeight: 600,
            textAlign: 'left',
            breakInside: 'avoid',
          }}
        >
          <Inlines runs={node.children} />
        </blockquote>
      );
    }
    case 'list': {
      const Tag = node.ordered ? 'ol' : 'ul';
      return (
        <Tag
          style={{ margin: '1mm 0', paddingLeft: '4mm', listStyle: node.ordered ? 'decimal' : 'disc' }}
        >
          {node.items.map((item, i) => (
            <li key={i} lang={detectLanguage(inlineText(item))} style={{ marginBottom: '1.2mm' }}>
              <Inlines runs={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case 'image':
      return (
        <figure style={{ margin: '0 0 2mm', breakInside: 'avoid' }}>
          <AssetImage assetId={node.assetId} />
          {node.caption.trim() !== '' && (
            <figcaption
              lang={detectLanguage(node.caption)}
              style={{ fontSize: '7pt', fontStyle: 'italic', color: '#333', marginTop: '0.6mm' }}
            >
              {node.caption}
            </figcaption>
          )}
        </figure>
      );
  }
}

/**
 * One story as it appears in print: kicker, headline, deck, byline, the first photo as a wide
 * picture that grows or shrinks to use the tile's height, then the text in balanced columns
 * with a bold dateline run-in and an optional jump line.
 */
export function ArticleView({ article, cols, leaf, onOverflowChange }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const lastOverflow = useRef(false);

  const check = useCallback(() => {
    const el = rootRef.current;
    if (!el || !onOverflowChange) return;
    // Text that does not fit pushes past the bottom of the tile.
    const overflowing = el.scrollHeight > el.clientHeight + 1;
    if (overflowing !== lastOverflow.current) {
      lastOverflow.current = overflowing;
      onOverflowChange(overflowing);
    }
  }, [onOverflowChange]);

  useLayoutEffect(check);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    void document.fonts.ready.then(check);
    return () => observer.disconnect();
  }, [check]);

  const look = resolveStyle(leaf);
  const accent = PALETTE[look.accent];
  const heroIndex = article.body.findIndex((n) => n.type === 'image');
  const hero = heroIndex >= 0 ? article.body[heroIndex] : undefined;
  const bodyNodes = article.body.filter((_, i) => i !== heroIndex);
  const overPhoto = look.headlineOverPhoto && hero?.type === 'image';
  const dateline = (article.dateline ?? '').trim();
  const firstText = bodyNodes.findIndex(
    (n) => n.type === 'paragraph' && inlineText(n.children).trim() !== '',
  );

  const headline = article.headline.trim() !== '' && (
    <h2
      className="headline"
      lang={detectLanguage(article.headline)}
      style={{
        margin: overPhoto ? 0 : '0 0 1.2mm',
        fontSize: `${headlinePt(cols, leaf.role)}pt`,
        flex: overPhoto ? '0 1 auto' : 'none',
        minWidth: 0,
        maxWidth: '100%',
        overflowWrap: 'anywhere',
        color: overPhoto ? '#fff' : look.headlineColor === 'accent' ? accent : PALETTE.ink,
        ...HEADLINE_FONT[look.headlineFont],
        ...(overPhoto && {
          textShadow: '0 0 1.2mm rgba(0,0,0,0.9), 0 0.3mm 0.6mm rgba(0,0,0,0.9)',
          WebkitTextStroke: '0.35mm #000',
          paintOrder: 'stroke fill',
        }),
      }}
    >
      {article.headline}
    </h2>
  );

  const deckAndByline = (
    <>
        {article.subHeadline.trim() !== '' && (
          <p
            lang={detectLanguage(article.subHeadline)}
            style={{
              margin: '0 0 1.2mm',
              padding: look.deckBand ? '0.8mm 2mm' : 0,
              background: look.deckBand ? DECK_BAND : undefined,
              fontSize: role11(leaf),
              fontWeight: 800,
              color: look.deckBand || look.headlineColor === 'ink' ? accent : PALETTE.ink,
              textAlign: look.deckBand ? 'center' : undefined,
              flex: 'none',
            }}
          >
            {article.subHeadline}
          </p>
        )}
        {article.byline.trim() !== '' && (
          <p
            lang={detectLanguage(article.byline)}
            style={{
              margin: '0 0 1.5mm',
              fontSize: '7pt',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-ui)',
              fontWeight: 600,
              color: accent,
              flex: 'none',
            }}
          >
            {article.byline}
          </p>
        )}
    </>
  );

  return (
    <article
      ref={rootRef}
      className="paper"
      onLoadCapture={check}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {look.kicker.trim() !== '' && (
        <div
          lang={detectLanguage(look.kicker)}
          style={{
            alignSelf: 'flex-start',
            margin: '0 0 1mm',
            padding: '0.4mm 2mm',
            background: accent,
            color: '#fff',
            fontFamily: 'var(--font-ui)',
            fontSize: '7.5pt',
            fontWeight: 800,
            letterSpacing: '0.04em',
            flex: 'none',
          }}
        >
          {look.kicker}
        </div>
      )}
      {!overPhoto && headline}
      {!overPhoto && deckAndByline}
      {hero?.type === 'image' && (
        <figure
          style={{
            margin: '0 0 1.5mm',
            flex: '1 1 0',
            minHeight: `${heroMinForLeaf(article, cols, leaf)}mm`,
            // Never let the photo grow taller than a 3:2 picture would be at this width.
            maxHeight: `${spanWidthMm(cols) * 0.67}mm`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
            <AssetImage
              assetId={hero.assetId}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {overPhoto && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '2mm',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0) 65%)',
                }}
              >
                {headline}
              </div>
            )}
          </div>
          {hero.caption.trim() !== '' && (
            <figcaption
              lang={detectLanguage(hero.caption)}
              style={{ flex: 'none', fontSize: '7pt', fontStyle: 'italic', color: '#333', marginTop: '0.6mm' }}
            >
              {hero.caption}
            </figcaption>
          )}
        </figure>
      )}
      {overPhoto && deckAndByline}
      <div
        style={{
          flex: '0 0 auto',
          columnCount: cols,
          columnGap: '4mm',
          columnFill: 'balance',
          columnRule: `${RULE_MM.hairline}mm solid #aaa`,
          fontSize: `${bodyPt(leaf.role)}pt`,
          textAlign: 'justify',
        }}
      >
        {bodyNodes.map((node, i) => (
          <Node
            key={i}
            node={node}
            index={i}
            dateline={i === firstText ? dateline : ''}
            accent={accent}
          />
        ))}
      </div>
      {look.jump.trim() !== '' && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            padding: '0 1.5mm',
            border: `${RULE_MM.standard}mm solid ${accent}`,
            background: '#fff',
            color: accent,
            fontFamily: 'var(--font-ui)',
            fontSize: '8pt',
            fontWeight: 800,
          }}
        >
          {look.jump}
        </div>
      )}
    </article>
  );
}

const role11 = (leaf: Leaf): string => (leaf.role === 'brief' ? '9pt' : '11pt');

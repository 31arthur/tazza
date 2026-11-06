import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { inlineText, type Article, type BodyNode } from '@domain/entities/Article';
import type { SlotRole } from '@domain/layout/tree';
import { bodyPt, headlinePt, heroMinMm } from '@domain/services/CopyfitEstimator';
import { detectLanguage } from '@domain/services/detectLanguage';
import { spanWidthMm } from '@domain/services/PageGeometry';
import { AssetImage } from './AssetImage';
import { Inlines } from './Inlines';

interface Props {
  article: Article;
  /** Number of page columns the story spans. */
  cols: number;
  role: SlotRole;
  /** When given, called whenever the story starts or stops overflowing its tile. */
  onOverflowChange?: ((overflowing: boolean) => void) | undefined;
}

function Node({ node, index }: { node: BodyNode; index: number }): ReactNode {
  switch (node.type) {
    case 'paragraph': {
      const text = inlineText(node.children);
      if (text.trim() === '') return null;
      return (
        <p lang={detectLanguage(text)} style={{ margin: 0, textIndent: index > 0 ? '3mm' : 0 }}>
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
            borderTop: '0.4mm solid #1d4ed8',
            borderBottom: '0.4mm solid #1d4ed8',
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
 * One story as it appears in print: headline across the tile, the first photo as a wide
 * picture that grows or shrinks to use the tile's height, and the text flowing in columns.
 */
export function ArticleView({ article, cols, role, onOverflowChange }: Props) {
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

  const heroIndex = article.body.findIndex((n) => n.type === 'image');
  const hero = heroIndex >= 0 ? article.body[heroIndex] : undefined;
  const bodyNodes = article.body.filter((_, i) => i !== heroIndex);
  const headSize = headlinePt(cols, role);

  return (
    <article
      ref={rootRef}
      className="paper"
      onLoadCapture={check}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {article.headline.trim() !== '' && (
        <h2
          className="headline"
          lang={detectLanguage(article.headline)}
          style={{
            margin: '0 0 1.2mm',
            fontSize: `${headSize}pt`,
            flex: 'none',
            ...(role === 'banner' && { fontWeight: 800, letterSpacing: '-0.01em' }),
          }}
        >
          {article.headline}
        </h2>
      )}
      {article.subHeadline.trim() !== '' && (
        <p
          lang={detectLanguage(article.subHeadline)}
          style={{
            margin: '0 0 1.2mm',
            fontSize: role === 'brief' ? '9pt' : '11pt',
            fontWeight: 600,
            color: '#222',
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
            color: '#1d4ed8',
            flex: 'none',
          }}
        >
          {article.byline}
        </p>
      )}
      {hero?.type === 'image' && (
        <figure
          style={{
            margin: '0 0 1.5mm',
            flex: '1 1 0',
            minHeight: `${heroMinMm(cols)}mm`,
            // Never let the photo grow taller than a 3:2 picture would be at this width.
            maxHeight: `${spanWidthMm(cols) * 0.67}mm`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}>
            <AssetImage
              assetId={hero.assetId}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
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
      <div
        style={{
          flex: '0 0 auto',
          columnCount: cols,
          columnGap: '4mm',
          columnFill: 'balance',
          columnRule: '0.2mm solid #bbb',
          fontSize: `${bodyPt(role)}pt`,
          textAlign: 'justify',
        }}
      >
        {bodyNodes.map((node, i) => (
          <Node key={i} node={node} index={i} />
        ))}
      </div>
    </article>
  );
}

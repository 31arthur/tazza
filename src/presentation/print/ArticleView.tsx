import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { inlineText, type Article, type BodyNode } from '@domain/entities/Article';
import { BODY_PT, headlinePt } from '@domain/services/CopyfitEstimator';
import { detectLanguage } from '@domain/services/detectLanguage';
import { AssetImage } from './AssetImage';
import { Inlines } from './Inlines';

interface Props {
  article: Article;
  colSpan: number;
  /** When given, called whenever the body text starts or stops overflowing its block. */
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
            borderTop: '0.4mm solid #111',
            borderBottom: '0.4mm solid #111',
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
        <Tag style={{ margin: '1mm 0', paddingLeft: '5mm', listStyle: node.ordered ? 'decimal' : 'disc' }}>
          {node.items.map((item, i) => (
            <li key={i} lang={detectLanguage(inlineText(item))}>
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

/** One story as it appears in print: headline across the block, body flowing in columns. */
export function ArticleView({ article, colSpan, onOverflowChange }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const lastOverflow = useRef(false);

  const check = useCallback(() => {
    const el = bodyRef.current;
    if (!el || !onOverflowChange) return;
    // With a fixed height, text that does not fit spills into extra columns to the right.
    const overflowing = el.scrollWidth > el.clientWidth + 1;
    if (overflowing !== lastOverflow.current) {
      lastOverflow.current = overflowing;
      onOverflowChange(overflowing);
    }
  }, [onOverflowChange]);

  useLayoutEffect(check);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    void document.fonts.ready.then(check);
    return () => observer.disconnect();
  }, [check]);

  const headlineLang = detectLanguage(article.headline);
  const empty = article.headline.trim() === '' && article.body.length === 0;

  return (
    <article
      className="paper"
      style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {article.headline.trim() !== '' && (
        <h2
          className="headline"
          lang={headlineLang}
          style={{ margin: '0 0 1mm', fontSize: `${headlinePt(colSpan)}pt` }}
        >
          {article.headline}
        </h2>
      )}
      {article.subHeadline.trim() !== '' && (
        <p
          lang={detectLanguage(article.subHeadline)}
          style={{ margin: '0 0 1.2mm', fontSize: '11pt', fontWeight: 600, color: '#222' }}
        >
          {article.subHeadline}
        </p>
      )}
      {article.byline.trim() !== '' && (
        <p
          lang={detectLanguage(article.byline)}
          style={{
            margin: '0 0 1.5mm',
            fontSize: '7.5pt',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-ui)',
            fontWeight: 600,
            color: '#555',
          }}
        >
          {article.byline}
        </p>
      )}
      <div
        ref={bodyRef}
        onLoadCapture={check}
        style={{
          flex: '1 1 0',
          minHeight: 0,
          overflow: 'hidden',
          columnCount: colSpan,
          columnGap: '4mm',
          columnFill: 'balance',
          columnRule: '0.2mm solid #bbb',
          fontSize: `${BODY_PT}pt`,
          textAlign: 'justify',
        }}
      >
        {empty ? null : article.body.map((node, i) => <Node key={i} node={node} index={i} />)}
      </div>
    </article>
  );
}

import type { ReactNode } from 'react';
import type { Article } from '@domain/entities/Article';
import type { Page } from '@domain/entities/Edition';
import { layoutRects, type PlacedLeaf } from '@domain/layout/tree';
import type { Masthead as MastheadSettings } from '@domain/layout/style';
import { GRID } from '@domain/services/PageGeometry';
import { ArticleView } from './ArticleView';
import { LeafFrame } from './LeafFrame';
import { Folio, Masthead, RunningHeader } from './PageChrome';

export interface RenderLeafArgs {
  placed: PlacedLeaf;
  article: Article | undefined;
}

interface Props {
  page: Page;
  editionId: string;
  masthead: MastheadSettings;
  articles: ReadonlyMap<string, Article>;
  /** Override how a tile is drawn (the layout canvas adds selection and dragging). */
  renderLeaf?: ((args: RenderLeafArgs) => ReactNode) | undefined;
  /** Drawn on top of the page in page coordinates (drop highlights, dividers). */
  overlay?: ((leaves: readonly PlacedLeaf[]) => ReactNode) | undefined;
}

export function PrintLeaf({ placed, article }: RenderLeafArgs) {
  return (
    <LeafFrame placed={placed}>
      {article && <ArticleView article={article} cols={placed.cols} leaf={placed.leaf} />}
    </LeafFrame>
  );
}

/**
 * Draws one A3 page at its real size (297 x 420 mm). The layout canvas, the preview and the
 * print output all use this component, so what you see is what is printed.
 */
export function PageRenderer({ page, editionId, masthead, articles, renderLeaf, overlay }: Props) {
  const { leaves } = layoutRects(page.layout, page.number);
  const draw = renderLeaf ?? PrintLeaf;
  return (
    <div
      className="paper"
      style={{
        position: 'relative',
        width: `${GRID.pageWidthMm}mm`,
        height: `${GRID.pageHeightMm}mm`,
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      {page.number === 1 ? (
        <Masthead editionId={editionId} settings={masthead} />
      ) : (
        <RunningHeader editionId={editionId} settings={masthead} />
      )}
      {leaves.map((placed) => (
        <div key={placed.leaf.id} style={{ display: 'contents' }}>
          {draw({
            placed,
            article: placed.leaf.articleId ? articles.get(placed.leaf.articleId) : undefined,
          })}
        </div>
      ))}
      {overlay?.(leaves)}
      <Folio pageNumber={page.number} printMarks={masthead.printMarks} />
    </div>
  );
}

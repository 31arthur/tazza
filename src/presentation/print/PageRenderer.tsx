import type { ReactNode } from 'react';
import type { Article } from '@domain/entities/Article';
import type { Block, Page } from '@domain/entities/Edition';
import { GRID, placementRectMm, type RectMm } from '@domain/services/PageGeometry';
import { Folio, Masthead, RunningHeader } from './PageChrome';
import { ArticleView } from './ArticleView';

export interface RenderBlockArgs {
  block: Block;
  rect: RectMm;
  article: Article | undefined;
}

interface Props {
  page: Page;
  editionId: string;
  articles: ReadonlyMap<string, Article>;
  /** Override how a block is drawn (the layout canvas adds drag handles). */
  renderBlock?: ((args: RenderBlockArgs) => ReactNode) | undefined;
}

export const blockBoxStyle = (rect: RectMm) =>
  ({
    position: 'absolute',
    left: `${rect.x}mm`,
    top: `${rect.y}mm`,
    width: `${rect.w}mm`,
    height: `${rect.h}mm`,
    boxSizing: 'border-box',
  }) as const;

export function PrintBlock({ block, rect, article }: RenderBlockArgs) {
  return (
    <div
      style={{ ...blockBoxStyle(rect), borderBottom: '0.2mm solid #888', paddingBottom: '1.5mm' }}
    >
      {article && <ArticleView article={article} colSpan={block.placement.colSpan} />}
    </div>
  );
}

/**
 * Draws one A3 page at its real size (297 x 420 mm). The layout canvas, the preview and the
 * print output all use this component, so what you see is what is printed.
 */
export function PageRenderer({ page, editionId, articles, renderBlock }: Props) {
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
        <Masthead editionId={editionId} />
      ) : (
        <RunningHeader editionId={editionId} />
      )}
      {page.blocks.map((block) => {
        const args: RenderBlockArgs = {
          block,
          rect: placementRectMm(block.placement, page.number),
          article: articles.get(block.articleId),
        };
        return (
          <div key={block.id} style={{ display: 'contents' }}>
            {(renderBlock ?? PrintBlock)(args)}
          </div>
        );
      })}
      <Folio pageNumber={page.number} />
    </div>
  );
}

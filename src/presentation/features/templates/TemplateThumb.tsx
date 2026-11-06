import type { PageTemplateData } from '@domain/entities/LibraryItem';
import { resolveMasthead, type Masthead } from '@domain/layout/style';
import { PageRenderer } from '../../print/PageRenderer';
import { ScaledPage } from '../../print/ScaledPage';

const NO_ARTICLES = new Map();

/** A small picture of a saved page: its tiles as labelled boxes, plus its objects. */
export function TemplateThumb({
  data,
  editionId,
  masthead,
  scale = 0.17,
}: {
  data: PageTemplateData;
  editionId: string;
  masthead?: Partial<Masthead> | undefined;
  scale?: number;
}) {
  return (
    <div className="inline-block overflow-hidden rounded border bg-white shadow-sm">
      <ScaledPage scale={scale}>
        <PageRenderer
          page={{ number: 1, layout: data.layout, objects: data.objects, guides: data.guides }}
          editionId={editionId}
          masthead={resolveMasthead(masthead)}
          articles={NO_ARTICLES}
          renderLeaf={({ placed }) => (
            <div
              style={{
                position: 'absolute',
                left: `${placed.rect.x}mm`,
                top: `${placed.rect.y}mm`,
                width: `${placed.rect.w}mm`,
                height: `${placed.rect.h}mm`,
                boxSizing: 'border-box',
                border: '0.6mm dashed #94a3b8',
                background: placed.leaf.element ? '#e2e8f0' : '#f8fafc',
                color: '#64748b',
                fontFamily: 'var(--font-ui)',
                fontSize: '12pt',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {placed.leaf.element ? placed.leaf.element.type : placed.leaf.role}
            </div>
          )}
        />
      </ScaledPage>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { masterObjectsFor } from '@domain/entities/Edition';
import { flowSlices } from '@domain/layout/flow';
import { resolveMasthead } from '@domain/layout/style';
import { GRID } from '@domain/services/PageGeometry';
import { useUseCases } from '../../hooks/AppContext';
import { CropMarks, printSheetCss } from '../../print/CropMarks';
import { PageRenderer } from '../../print/PageRenderer';
import { ScaledPage } from '../../print/ScaledPage';
import { useEditionStore } from '../../state/editionStore';
import { useArticles, useEdition, useEditionId } from '../queries';

declare global {
  interface Window {
    __tazzaReady?: boolean;
    __tazzaImport?: (bundleJson: string) => Promise<void>;
  }
}

/** True once every picture on the page has finished loading and decoding. */
const picturesSettled = (): boolean =>
  [...document.images].every((img) => img.complete && img.naturalWidth > 0);

/**
 * The pages at full size and nothing else, for the PDF exporter. It is opened by a headless
 * browser, which hands it an edition bundle; people do not use it directly.
 */
export function RenderPage() {
  const editionId = useEditionId();
  const { importEditionBundle } = useUseCases();
  const queryClient = useQueryClient();
  const setEditionId = useEditionStore((s) => s.setEditionId);
  const [params] = useSearchParams();
  const marks = params.get('marks') === '1';
  const [loaded, setLoaded] = useState(false);
  const { data: edition } = useEdition();
  const { data: articleList = [] } = useArticles();
  const articles = useMemo(() => new Map(articleList.map((a) => [a.id, a])), [articleList]);
  const flow = useMemo(
    () => (edition ? flowSlices(edition, (id) => articles.get(id)) : undefined),
    [edition, articles],
  );

  useEffect(() => {
    window.__tazzaImport = async (bundleJson) => {
      const imported = await importEditionBundle.execute({ file: new Blob([bundleJson]) });
      setEditionId(imported.editionId);
      await queryClient.invalidateQueries();
      setLoaded(true);
    };
    return () => {
      delete window.__tazzaImport;
    };
  }, [importEditionBundle, queryClient, setEditionId]);

  useEffect(() => {
    if (!loaded || !edition) return;
    let stable = 0;
    const timer = window.setInterval(() => {
      void document.fonts.ready.then(() => {
        stable = picturesSettled() ? stable + 1 : 0;
        if (stable >= 4) {
          window.clearInterval(timer);
          window.__tazzaReady = true;
        }
      });
    }, 150);
    return () => window.clearInterval(timer);
  }, [loaded, edition, articleList]);

  if (!loaded || !edition) return null;

  return (
    <div className="bg-white">
      {marks && <style>{printSheetCss}</style>}
      {edition.pages.map((page) => (
        <figure key={page.number} id={`page-${page.number}`} className="page-fig m-0">
          <ScaledPage scale={1}>
            <PageRenderer
              page={page}
              editionId={editionId}
              masthead={resolveMasthead(edition.masthead)}
              articles={articles}
              masterObjects={masterObjectsFor(edition, page)}
              flow={flow}
            />
          </ScaledPage>
          {marks && (
            <CropMarks
              widthMm={GRID.pageWidthMm}
              heightMm={GRID.pageHeightMm}
              label={`TAZZA · ${editionId} · ${page.number}`}
            />
          )}
        </figure>
      ))}
    </div>
  );
}

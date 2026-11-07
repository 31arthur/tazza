import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { masterObjectsFor } from '@domain/entities/Edition';
import { flowSlices } from '@domain/layout/flow';
import { articleIdsOf } from '@domain/layout/tree';
import { resolveMasthead } from '@domain/layout/style';
import { GRID } from '@domain/services/PageGeometry';
import { countBySeverity } from '@domain/services/preflight';
import { useFitScale } from '../../hooks/useFitScale';
import { BLEED_MM, CropMarks, printSheetCss } from '../../print/CropMarks';
import { PageRenderer } from '../../print/PageRenderer';
import { ScaledPage } from '../../print/ScaledPage';
import { useArticles, useEdition, useEditionId, usePreflight } from '../queries';
import { ExportMenu } from './ExportMenu';
import { PreflightPanel } from './PreflightPanel';

/** Publish: the pages as they will print, and a single panel that says whether they are ready. */
export function PreviewPage() {
  const { t } = useTranslation();
  const editionId = useEditionId();
  const { data: edition } = useEdition();
  const { data: articleList = [] } = useArticles();
  const { ref, scale } = useFitScale(64, 1.2);
  const [marks, setMarks] = useState(false);
  const { data: issues, refetch, isFetching } = usePreflight(true, marks ? BLEED_MM : 0);
  const articles = useMemo(() => new Map(articleList.map((a) => [a.id, a])), [articleList]);
  const flow = useMemo(
    () => (edition ? flowSlices(edition, (id) => articles.get(id)) : undefined),
    [edition, articles],
  );

  if (!edition) return null;
  const hasContent = edition.pages.some((p) => articleIdsOf(p.layout).length > 0);
  const counts = issues ? countBySeverity(issues) : undefined;

  const print = async () => {
    const found = (await refetch()).data ?? [];
    if (countBySeverity(found).error > 0 && !window.confirm(t('preflight.confirmPrint'))) return;
    window.print();
  };

  return (
    <div className="grid h-full grid-cols-[1fr_20rem] print:block print:h-auto">
      <div ref={ref} className="overflow-auto bg-neutral-200 p-8 print:overflow-visible print:bg-white print:p-0">
        {marks && <style>{printSheetCss}</style>}
        {!hasContent && (
          <p className="no-print mb-6 text-center text-muted-foreground">
            {t('preview.empty')}{' '}
            <Link to="/layout" className="underline">
              {t('nav.layout')}
            </Link>
          </p>
        )}
        <div className="mx-auto flex w-fit flex-col gap-8 print:block print:gap-0">
          {edition.pages.map((page) => (
            <figure key={page.number} id={`page-${page.number}`} className="page-fig m-0">
              <figcaption className="no-print mb-1 text-xs text-muted-foreground">
                {t('layout.page', { n: page.number })} · A3 · 297 × 420 mm
              </figcaption>
              <ScaledPage scale={scale}>
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
                  label={`TAZZA · ${editionId} · ${t('layout.page', { n: page.number })}`}
                />
              )}
            </figure>
          ))}
        </div>
      </div>

      <aside className="no-print flex min-h-0 flex-col gap-5 overflow-y-auto border-l bg-card p-4">
        <section>
          <h2 className="font-display text-xl font-bold">{t('publish.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('publish.hint')}</p>
        </section>

        <section className="rounded-xl border">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h3 className="text-sm font-semibold">{t('publish.checks')}</h3>
            {isFetching ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : counts && counts.error === 0 && counts.warning === 0 ? (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="size-4" /> {t('publish.ready')}
              </span>
            ) : (
              <button type="button" className="text-xs underline" onClick={() => void refetch()}>
                {t('publish.recheck')}
              </button>
            )}
          </div>
          {issues && (
            <PreflightPanel
              issues={issues}
              onGoToPage={(n) => document.getElementById(`page-${n}`)?.scrollIntoView({ behavior: 'smooth' })}
            />
          )}
        </section>

        <label className="flex items-start gap-2 text-sm" title={t('preview.marksHint')}>
          <input type="checkbox" className="mt-1" checked={marks} onChange={(e) => setMarks(e.target.checked)} />
          <span>
            {t('preview.marks')}
            <span className="block text-xs text-muted-foreground">{t('publish.marksNote')}</span>
          </span>
        </label>

        <ExportMenu marks={marks} pageCount={edition.pages.length} onPrint={() => void print()} canPrint={hasContent} />
      </aside>
    </div>
  );
}

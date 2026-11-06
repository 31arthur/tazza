import { useMemo, useState } from 'react';
import { ClipboardCheck, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { resolveMasthead } from '@domain/layout/style';
import { masterObjectsFor } from '@domain/entities/Edition';
import { flowSlices } from '@domain/layout/flow';
import { articleIdsOf } from '@domain/layout/tree';
import { GRID } from '@domain/services/PageGeometry';
import { countBySeverity } from '@domain/services/preflight';
import { Button } from '../../components/ui/button';
import { useFitScale } from '../../hooks/useFitScale';
import { BLEED_MM, CropMarks, printSheetCss } from '../../print/CropMarks';
import { PageRenderer } from '../../print/PageRenderer';
import { ScaledPage } from '../../print/ScaledPage';
import { useArticles, useEdition, useEditionId, usePreflight } from '../queries';
import { ExportMenu } from './ExportMenu';
import { PreflightPanel } from './PreflightPanel';

export function PreviewPage() {
  const { t } = useTranslation();
  const editionId = useEditionId();
  const { data: edition } = useEdition();
  const { data: articleList = [] } = useArticles();
  const { ref, scale } = useFitScale(64, 1.2);
  const [checking, setChecking] = useState(false);
  const [marks, setMarks] = useState(false);
  const { data: issues = [], refetch } = usePreflight(checking, marks ? BLEED_MM : 0);
  const articles = useMemo(() => new Map(articleList.map((a) => [a.id, a])), [articleList]);
  const flow = useMemo(
    () => (edition ? flowSlices(edition, (id) => articles.get(id)) : undefined),
    [edition, articles],
  );

  if (!edition) return null;
  const hasContent = edition.pages.some((p) => articleIdsOf(p.layout).length > 0);

  const print = async () => {
    const found = (await refetch()).data ?? [];
    if (countBySeverity(found).error > 0 && !window.confirm(t('preflight.confirmPrint'))) return;
    window.print();
  };

  return (
    <div className="flex h-full flex-col print:block print:h-auto">
      <div className="no-print flex items-center justify-between gap-4 border-b bg-card p-3">
        <p className="text-sm text-muted-foreground">{t('preview.hint')}</p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 whitespace-nowrap text-sm" title={t('preview.marksHint')}>
            <input type="checkbox" checked={marks} onChange={(e) => setMarks(e.target.checked)} />
            {t('preview.marks')}
          </label>
          <ExportMenu marks={marks} pageCount={edition.pages.length} />
          <Button
            variant="outline"
            aria-pressed={checking}
            onClick={() => {
              if (checking) void refetch();
              setChecking(true);
            }}
          >
            <ClipboardCheck /> {t('preflight.check')}
          </Button>
          <Button onClick={() => void print()} disabled={!hasContent}>
            <Printer /> {t('preview.print')}
          </Button>
        </div>
      </div>
      {checking && (
        <div className="no-print border-b bg-card">
          <PreflightPanel
            issues={issues}
            onGoToPage={(n) =>
              document.getElementById(`page-${n}`)?.scrollIntoView({ behavior: 'smooth' })
            }
          />
        </div>
      )}
      {marks && <style>{printSheetCss}</style>}
      <div ref={ref} className="flex-1 overflow-auto bg-neutral-200 p-8 print:overflow-visible print:bg-white print:p-0">
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
    </div>
  );
}

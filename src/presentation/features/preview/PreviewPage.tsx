import { useMemo } from 'react';
import { Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { resolveMasthead } from '@domain/layout/style';
import { articleIdsOf } from '@domain/layout/tree';
import { Button } from '../../components/ui/button';
import { useFitScale } from '../../hooks/useFitScale';
import { PageRenderer } from '../../print/PageRenderer';
import { ScaledPage } from '../../print/ScaledPage';
import { useArticles, useEdition, useEditionId } from '../queries';

export function PreviewPage() {
  const { t } = useTranslation();
  const editionId = useEditionId();
  const { data: edition } = useEdition();
  const { data: articleList = [] } = useArticles();
  const { ref, scale } = useFitScale(64, 1.2);
  const articles = useMemo(() => new Map(articleList.map((a) => [a.id, a])), [articleList]);

  if (!edition) return null;
  const hasContent = edition.pages.some((p) => articleIdsOf(p.layout).length > 0);

  return (
    <div className="flex h-full flex-col print:block print:h-auto">
      <div className="no-print flex items-center justify-between gap-4 border-b bg-card p-3">
        <p className="text-sm text-muted-foreground">{t('preview.hint')}</p>
        <Button onClick={() => window.print()} disabled={!hasContent}>
          <Printer /> {t('preview.print')}
        </Button>
      </div>
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
            <figure key={page.number} className="page-fig m-0">
              <figcaption className="no-print mb-1 text-xs text-muted-foreground">
                {t('layout.page', { n: page.number })} · A3 · 297 × 420 mm
              </figcaption>
              <ScaledPage scale={scale}>
                <PageRenderer
                  page={page}
                  editionId={editionId}
                  masthead={resolveMasthead(edition.masthead)}
                  articles={articles}
                />
              </ScaledPage>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}

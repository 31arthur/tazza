import { useMemo } from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { statusOf } from '@domain/entities/Article';
import { canOpen, type Area } from '@domain/entities/Workflow';
import { placedArticleIds } from '@domain/entities/Edition';
import { cn } from '../../lib/utils';
import { pathOf } from '../../lib/areas';
import { useWorkStore } from '../../state/workStore';
import { useArticles, useEdition } from '../queries';

interface Step {
  area: Area;
  key: string;
  done: boolean;
  count: number;
}

/**
 * The day in four steps (write, review, arrange, publish) with what is left at each, so
 * everyone can see where the edition stands and jump to the step that needs them.
 */
export function WorkflowRail() {
  const { t } = useTranslation();
  const role = useWorkStore((s) => s.role);
  const { pathname } = useLocation();
  const { data: articles = [] } = useArticles();
  const { data: edition } = useEdition();

  const steps = useMemo<Step[]>(() => {
    const drafts = articles.filter((a) => statusOf(a) === 'draft').length;
    const inReview = articles.filter((a) => statusOf(a) === 'review').length;
    const placed = edition ? placedArticleIds(edition) : new Set<string>();
    const waiting = articles.filter((a) => !placed.has(a.id)).length;
    const placedNotApproved = articles.filter((a) => placed.has(a.id) && statusOf(a) !== 'approved').length;
    const hasStories = articles.length > 0;
    const written = hasStories && drafts === 0;
    const reviewed = written && inReview === 0;
    const arranged = reviewed && waiting === 0;
    return [
      { area: 'write', key: 'write', done: written, count: drafts },
      { area: 'newsroom', key: 'review', done: reviewed, count: inReview },
      { area: 'studio', key: 'arrange', done: arranged, count: waiting },
      { area: 'publish', key: 'publish', done: arranged && placedNotApproved === 0, count: placedNotApproved },
    ];
  }, [articles, edition]);

  return (
    <nav aria-label={t('rail.title')} className="no-print flex items-stretch gap-1 border-b bg-card px-4">
      {steps.map((step, index) => {
        const allowed = canOpen(role, step.area);
        const current = pathname === pathOf(step.area);
        const body = (
          <>
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                step.done ? 'bg-emerald-600 text-white' : current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {step.done ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span className="min-w-0 text-left leading-tight">
              <span className="block text-sm font-medium">{t(`rail.${step.key}`)}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {t(`rail.${step.key}Hint`, { count: step.count })}
              </span>
            </span>
          </>
        );
        const cls = cn(
          'flex items-center gap-2 border-b-2 px-3 py-2',
          current ? 'border-primary' : 'border-transparent',
          allowed ? 'hover:bg-accent' : 'cursor-default opacity-60',
        );
        return allowed ? (
          <Link key={step.key} to={pathOf(step.area)} className={cls}>
            {body}
          </Link>
        ) : (
          <div key={step.key} className={cls} title={t('rail.notYours')}>
            {body}
          </div>
        );
      })}
    </nav>
  );
}

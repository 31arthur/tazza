import { useState } from 'react';
import { Check, Circle, Clock, History, MessageSquare, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { statusOf, type Article } from '@domain/entities/Article';
import { nextStatuses, type ArticleStatus } from '@domain/entities/Workflow';
import { checklistProgress, readingMinutes, storyChecklist } from '@domain/services/storyChecklist';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { useWorkflowActions } from '../queries';
import { StatusBadge } from './StatusBadge';
import { WorkflowPanel } from './WorkflowPanel';

const ACTION_KEY: Record<string, string> = {
  'draft>review': 'submit',
  'review>approved': 'approve',
  'review>draft': 'sendBack',
  'approved>review': 'reopen',
};

/**
 * The writer's companion beside the page: where the story stands, one clear next step, and a
 * short checklist of what a finished story has. Comments and versions are one click away.
 */
export function StoryCoach({ article, flush }: { article: Article; flush: () => Promise<void> }) {
  const { t } = useTranslation();
  const { actor, changeStatus } = useWorkflowActions(flush);
  const [showHistory, setShowHistory] = useState(false);
  const status = statusOf(article);
  const moves = nextStatuses(actor.role, status);
  const items = storyChecklist(article);
  const progress = checklistProgress(items);
  const open = (article.notes ?? []).filter((n) => !n.system && !n.resolved).length;

  const move = async (to: ArticleStatus) => {
    let note: string | undefined;
    if (status === 'review' && to === 'draft') {
      note = window.prompt(t('workflow.sendBackPrompt'))?.trim();
      if (!note) return;
    }
    await changeStatus(article.id, to, note);
  };

  return (
    <aside className="flex flex-col gap-4" aria-label={t('coach.title')}>
      <section className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <StatusBadge status={status} />
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> {t('coach.readTime', { count: readingMinutes(article) })}
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t(`coach.hint.${status}`)}</p>
        <div className="mt-3 flex flex-col gap-2">
          {moves.map((to) => (
            <Button key={to} variant={to === 'draft' ? 'outline' : 'default'} onClick={() => void move(to)}>
              {to === 'review' ? <Send /> : <Check />} {t(`workflow.actions.${ACTION_KEY[`${status}>${to}`] ?? 'submit'}`)}
            </Button>
          ))}
          {moves.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {t('workflow.noMoves', { role: t(`workflow.roles.${actor.role}`) })}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t('coach.checklist')}</h3>
          <span className="text-xs text-muted-foreground">{Math.round(progress * 100)}%</span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.id} className={cn('flex items-start gap-2 text-sm', item.done && 'text-muted-foreground')}>
              {item.done ? (
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <span className={item.done ? 'line-through' : undefined}>{t(`coach.items.${item.id}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        onClick={() => setShowHistory(!showHistory)}
        className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-sm font-medium hover:bg-accent"
        aria-expanded={showHistory}
      >
        <span className="flex items-center gap-2">
          <MessageSquare className="size-4" /> {t('coach.notesAndVersions')}
          {open > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-800">{open}</span>}
        </span>
        <History className="size-4 text-muted-foreground" />
      </button>
      {showHistory && <WorkflowPanel article={article} flush={flush} compact />}
    </aside>
  );
}

import { useState } from 'react';
import { Check, History, MessageSquare, RotateCcw, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { statusOf, type Article } from '@domain/entities/Article';
import { nextStatuses, type ArticleStatus } from '@domain/entities/Workflow';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../lib/utils';
import { useWorkflowActions } from '../queries';
import { StatusBadge } from './StatusBadge';

const ACTION_KEY: Record<string, string> = {
  'draft>review': 'submit',
  'review>approved': 'approve',
  'review>draft': 'sendBack',
  'approved>review': 'reopen',
};

const when = (at: number) =>
  new Date(at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });

/**
 * The story's journey: its status and the moves this person may make, comments between
 * reporter, editor and designer, and saved versions to go back to.
 */
export function WorkflowPanel({
  article,
  flush,
}: {
  article: Article;
  /** Saves any typing still waiting, so a status change never works from stale text. */
  flush: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const { actor, changeStatus, addNote, resolveNote, saveVersion, restoreVersion } =
    useWorkflowActions(flush);
  const [comment, setComment] = useState('');
  const status = statusOf(article);
  const moves = nextStatuses(actor.role, status);
  const notes = article.notes ?? [];
  const versions = [...(article.versions ?? [])].reverse();

  const move = async (to: ArticleStatus) => {
    let note: string | undefined;
    if (status === 'review' && to === 'draft') {
      note = window.prompt(t('workflow.sendBackPrompt'))?.trim();
      if (!note) return;
    }
    await changeStatus(article.id, to, note);
  };

  const send = async () => {
    if (comment.trim() === '') return;
    if (await addNote(article.id, comment)) setComment('');
  };

  return (
    <aside className="flex flex-col gap-5 text-sm" aria-label={t('workflow.title')}>
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('workflow.title')}
          </h3>
          <StatusBadge status={status} />
        </div>
        {moves.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {moves.map((to) => (
              <Button
                key={to}
                variant={to === 'approved' ? 'default' : 'outline'}
                onClick={() => void move(to)}
              >
                <Check /> {t(`workflow.actions.${ACTION_KEY[`${status}>${to}`] ?? 'submit'}`)}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t('workflow.noMoves', { role: t(`workflow.roles.${actor.role}`) })}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <MessageSquare className="size-3.5" /> {t('workflow.comments')}
        </h3>
        <ul className="flex flex-col gap-1.5">
          {notes.map((n) =>
            n.system ? (
              <li key={n.id} className="text-xs text-muted-foreground">
                {n.author} · {n.text} · {when(n.at)}
              </li>
            ) : (
              <li
                key={n.id}
                className={cn(
                  'rounded border p-2',
                  n.resolved ? 'bg-muted text-muted-foreground' : 'border-amber-300 bg-amber-50',
                )}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {n.author} ({t(`workflow.roles.${n.role}`)}) · {when(n.at)}
                  </span>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void resolveNote(article.id, n.id, !n.resolved)}
                  >
                    {n.resolved ? t('workflow.reopenNote') : t('workflow.resolve')}
                  </button>
                </div>
                <p className={cn('mt-1 whitespace-pre-wrap', n.resolved && 'line-through')}>{n.text}</p>
              </li>
            ),
          )}
        </ul>
        <Textarea
          rows={2}
          value={comment}
          placeholder={t('workflow.commentPlaceholder')}
          aria-label={t('workflow.commentPlaceholder')}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && void send()}
        />
        <Button variant="outline" disabled={comment.trim() === ''} onClick={() => void send()}>
          {t('workflow.addComment')}
        </Button>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <History className="size-3.5" /> {t('workflow.versions')}
        </h3>
        <Button variant="outline" onClick={() => void saveVersion(article.id)}>
          <Save /> {t('workflow.saveVersion')}
        </Button>
        <ul className="flex flex-col gap-1">
          {versions.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 rounded border p-2">
              <span className="min-w-0 text-xs">
                <span className="block truncate font-medium">{v.headline.trim() || t('write.untitled')}</span>
                <span className="text-muted-foreground">
                  {v.author} · {when(v.at)}
                  {v.label !== '' && ` · ${v.label}`}
                </span>
              </span>
              <Button
                size="icon"
                variant="ghost"
                title={t('workflow.restoreVersion')}
                aria-label={t('workflow.restoreVersion')}
                onClick={() =>
                  window.confirm(t('workflow.confirmRestore')) && void restoreVersion(article.id, v.id)
                }
              >
                <RotateCcw />
              </Button>
            </li>
          ))}
          {versions.length === 0 && (
            <li className="text-xs text-muted-foreground">{t('workflow.noVersions')}</li>
          )}
        </ul>
      </section>
    </aside>
  );
}

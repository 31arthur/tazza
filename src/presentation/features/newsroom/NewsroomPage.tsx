import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, FilePlus2, MessageSquare, PenLine, RotateCcw, Sparkles, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { bodyParagraphs, statusOf, wordCount, type Article } from '@domain/entities/Article';
import { placedArticleIds, pageOf } from '@domain/entities/Edition';
import { canOpen, nextStatuses, type ArticleStatus } from '@domain/entities/Workflow';
import { detectLanguage } from '@domain/services/detectLanguage';
import { detectSection, SECTIONS } from '@domain/services/designAdvisor';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { useWorkStore } from '../../state/workStore';
import { useArticles, useEdition, useStoryActions, useWorkflowActions } from '../queries';
import { StatusBadge } from '../write/StatusBadge';

const KEYS: Record<string, string> = { 'draft>review': 'submit', 'review>approved': 'approve', 'review>draft': 'sendBack', 'approved>review': 'reopen' };

const COLUMNS: { status: ArticleStatus; tone: string }[] = [
  { status: 'draft', tone: 'border-t-neutral-400' },
  { status: 'review', tone: 'border-t-amber-500' },
  { status: 'approved', tone: 'border-t-emerald-600' },
];

function Card({ article, page, onOpen }: { article: Article; page: number | undefined; onOpen: (() => void) | undefined }) {
  const { t } = useTranslation();
  const { actor, changeStatus } = useWorkflowActions();
  const status = statusOf(article);
  const title = article.headline.trim();
  const snippet = bodyParagraphs(article.body).join(' ').slice(0, 110);
  const words = wordCount([article.headline, ...bodyParagraphs(article.body)].join(' '));
  const open = (article.notes ?? []).filter((n) => !n.system && !n.resolved).length;
  const section = detectSection(article);
  const moves = nextStatuses(actor.role, status);

  const move = async (to: ArticleStatus) => {
    let note: string | undefined;
    if (status === 'review' && to === 'draft') {
      note = window.prompt(t('workflow.sendBackPrompt'))?.trim();
      if (!note) return;
    }
    await changeStatus(article.id, to, note);
  };

  const ICON: Record<string, typeof Check> = { 'review>approved': Check, 'review>draft': Undo2, 'approved>review': RotateCcw, 'draft>review': Sparkles };

  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card p-3 shadow-sm">
      <button type="button" disabled={!onOpen} onClick={onOpen} className="block w-full text-left disabled:cursor-default">
        <div lang={detectLanguage(title)} className={cn('line-clamp-2 font-semibold', title === '' && 'text-muted-foreground')}>
          {title === '' ? t('write.untitled') : title}
        </div>
        {snippet !== '' && (
          <div lang={detectLanguage(snippet)} className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {snippet}
          </div>
        )}
      </button>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span>{t('write.words', { count: words })}</span>
        {section && (
          <span className="rounded-full bg-muted px-2 py-0.5" style={{ color: undefined }}>
            {SECTIONS[section].kicker.en.charAt(0) + SECTIONS[section].kicker.en.slice(1).toLowerCase()}
          </span>
        )}
        {open > 0 && (
          <span className="flex items-center gap-0.5 text-amber-700">
            <MessageSquare className="size-3" /> {open}
          </span>
        )}
        {page !== undefined && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">{t('write.placed', { page })}</span>}
      </div>
      {moves.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {moves.map((to) => {
            const Icon = ICON[`${status}>${to}`] ?? Check;
            const key = KEYS[`${status}>${to}`] ?? 'submit';
            return (
              <Button key={to} size="sm" variant={to === 'approved' ? 'default' : 'outline'} onClick={() => void move(to)}>
                <Icon /> {t(`workflow.actions.${key}`)}
              </Button>
            );
          })}
        </div>
      )}
    </motion.li>
  );
}

/** The editor's board: every story in the edition by status, with the next move one click away. */
export function NewsroomPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = useWorkStore((s) => s.role);
  const { data: articles = [] } = useArticles();
  const { data: edition } = useEdition();
  const { create, loadSamples } = useStoryActions();
  const placed = useMemo(() => (edition ? placedArticleIds(edition) : new Set<string>()), [edition]);
  const canWrite = canOpen(role, 'write');

  const open = (id: string) => navigate(`/write?a=${id}`);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">{t('newsroom.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('newsroom.subtitle')}</p>
          </div>
          {canWrite && (
            <Button onClick={async () => open((await create()).id)}>
              <FilePlus2 /> {t('write.newArticle')}
            </Button>
          )}
        </div>

        {articles.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <PenLine className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">{t('newsroom.empty')}</p>
            <Button className="mt-4" variant="outline" onClick={() => void loadSamples()}>
              <Sparkles /> {t('write.loadSamples')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {COLUMNS.map(({ status, tone }) => {
              const items = articles.filter((a) => statusOf(a) === status);
              return (
                <section key={status} className={cn('rounded-xl border border-t-4 bg-muted/40 p-3', tone)}>
                  <h2 className="mb-3 flex items-center justify-between px-1">
                    <StatusBadge status={status} />
                    <span className="text-sm text-muted-foreground">{items.length}</span>
                  </h2>
                  <ul className="flex flex-col gap-2.5">
                    {items.map((a) => (
                      <Card
                        key={a.id}
                        article={a}
                        page={edition ? pageOf(edition, a.id) : undefined}
                        onOpen={canWrite ? () => open(a.id) : undefined}
                      />
                    ))}
                    {items.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">{t(`newsroom.none.${status}`)}</li>}
                  </ul>
                  {status === 'approved' && placed.size < items.length && (
                    <p className="mt-3 px-1 text-xs text-muted-foreground">{t('newsroom.waitingForPage', { count: items.filter((a) => !placed.has(a.id)).length })}</p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

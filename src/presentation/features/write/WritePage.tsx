import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Maximize2, Minimize2, PenLine, Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { Article } from '@domain/entities/Article';
import { articleIdsOf } from '@domain/layout/tree';
import { Button } from '../../components/ui/button';
import { useUseCases } from '../../hooks/AppContext';
import { articlesKey, editionKey, useArticles, useEdition, useEditionId, useStoryActions } from '../queries';
import { ArticleEditor } from './ArticleEditor';
import { ArticleList } from './ArticleList';

/** The author's desk: a quiet list of stories and the page to write on. */
export function WritePage() {
  const { t } = useTranslation();
  const editionId = useEditionId();
  const { deleteArticle } = useUseCases();
  const queryClient = useQueryClient();
  const { data: articles = [] } = useArticles();
  const { data: edition } = useEdition();
  const { create, loadSamples } = useStoryActions();
  const [params, setParams] = useSearchParams();
  const [focus, setFocus] = useState(false);

  const selectedId = params.get('a') ?? undefined;
  const selected = articles.find((a) => a.id === selectedId);

  const placedOn = useMemo(() => {
    const map = new Map<string, number>();
    for (const page of edition?.pages ?? []) {
      for (const articleId of articleIdsOf(page.layout)) map.set(articleId, page.number);
    }
    return map;
  }, [edition]);

  const select = (id: string) => setParams({ a: id }, { replace: true });

  const onCreate = async () => select((await create()).id);

  const onLoadSamples = async () => {
    try {
      const created = await loadSamples();
      const first = created[0];
      if (first) select(first.id);
      toast.success(t('write.samplesLoaded', { count: created.length }));
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  const onDelete = async (article: Article) => {
    if (!window.confirm(t('write.confirmDelete'))) return;
    try {
      await deleteArticle.execute({ id: article.id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: articlesKey(editionId) }),
        queryClient.invalidateQueries({ queryKey: editionKey(editionId) }),
      ]);
      if (article.id === selectedId) setParams({}, { replace: true });
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  return (
    <div className={focus ? 'h-full' : 'grid h-full grid-cols-[16rem_1fr]'}>
      {!focus && (
        <aside className="border-r bg-card">
          <ArticleList
            articles={articles}
            placedOn={placedOn}
            selectedId={selectedId}
            onSelect={select}
            onCreate={() => void onCreate()}
            onDelete={(a) => void onDelete(a)}
            onLoadSamples={() => void onLoadSamples()}
          />
        </aside>
      )}
      <section className="relative h-full overflow-y-auto bg-neutral-50">
        {selected && (
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-4 top-3 z-20"
            onClick={() => setFocus(!focus)}
            title={focus ? t('write.exitFocus') : t('write.focus')}
          >
            {focus ? <Minimize2 /> : <Maximize2 />} {focus ? t('write.exitFocus') : t('write.focus')}
          </Button>
        )}
        {selected ? (
          <ArticleEditor
            key={`${selected.id}-${selected.versions?.length ?? 0}-${selected.status ?? ''}`}
            article={selected}
            focus={focus}
          />
        ) : (
          <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-4 p-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <PenLine className="size-7" />
            </span>
            <h2 className="font-display text-2xl font-bold">{t('write.welcomeTitle')}</h2>
            <p className="text-muted-foreground">{articles.length === 0 ? t('write.welcomeEmpty') : t('write.select')}</p>
            <div className="flex gap-2">
              <Button onClick={() => void onCreate()}>{t('write.newArticle')}</Button>
              {articles.length === 0 && (
                <Button variant="outline" onClick={() => void onLoadSamples()}>
                  <Sparkles /> {t('write.loadSamples')}
                </Button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

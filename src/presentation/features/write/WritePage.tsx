import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { Article } from '@domain/entities/Article';
import { useUseCases } from '../../hooks/AppContext';
import { articlesKey, editionKey, useArticles, useEdition, useEditionId } from '../queries';
import { ArticleEditor } from './ArticleEditor';
import { ArticleList } from './ArticleList';

export function WritePage() {
  const { t } = useTranslation();
  const editionId = useEditionId();
  const { createArticle, deleteArticle } = useUseCases();
  const queryClient = useQueryClient();
  const { data: articles = [] } = useArticles();
  const { data: edition } = useEdition();
  const [params, setParams] = useSearchParams();

  const selectedId = params.get('a') ?? undefined;
  const selected = articles.find((a) => a.id === selectedId);

  const placedOn = useMemo(() => {
    const map = new Map<string, number>();
    for (const page of edition?.pages ?? []) {
      for (const block of page.blocks) map.set(block.articleId, page.number);
    }
    return map;
  }, [edition]);

  const select = (id: string) => setParams({ a: id }, { replace: true });

  const onCreate = async () => {
    const article = await createArticle.execute({ editionId });
    await queryClient.invalidateQueries({ queryKey: articlesKey(editionId) });
    select(article.id);
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
    <div className="grid h-full grid-cols-[18rem_1fr]">
      <aside className="border-r bg-card">
        <ArticleList
          articles={articles}
          placedOn={placedOn}
          selectedId={selectedId}
          onSelect={select}
          onCreate={() => void onCreate()}
          onDelete={(a) => void onDelete(a)}
        />
      </aside>
      <section className="overflow-y-auto">
        {selected ? (
          <ArticleEditor key={selected.id} article={selected} />
        ) : (
          <p className="p-10 text-center text-muted-foreground">{t('write.select')}</p>
        )}
      </section>
    </div>
  );
}

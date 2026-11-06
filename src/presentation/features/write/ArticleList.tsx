import { AnimatePresence, motion } from 'framer-motion';
import { FilePlus2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { bodyParagraphs, type Article } from '@domain/entities/Article';
import { detectLanguage } from '@domain/services/detectLanguage';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

interface Props {
  articles: readonly Article[];
  /** article id -> page number it is placed on */
  placedOn: ReadonlyMap<string, number>;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (article: Article) => void;
}

export function ArticleList({ articles, placedOn, selectedId, onSelect, onCreate, onDelete }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <Button className="w-full" onClick={onCreate}>
          <FilePlus2 /> {t('write.newArticle')}
        </Button>
      </div>
      {articles.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{t('write.empty')}</p>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          <AnimatePresence initial={false}>
            {articles.map((article) => {
              const title = article.headline.trim();
              const snippet = bodyParagraphs(article.body).join(' ').slice(0, 90);
              const page = placedOn.get(article.id);
              return (
                <motion.li
                  key={article.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'group border-b',
                    article.id === selectedId ? 'bg-accent' : 'hover:bg-muted',
                  )}
                >
                  <div className="flex items-start gap-1 p-3">
                    <button
                      type="button"
                      onClick={() => onSelect(article.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div
                        lang={detectLanguage(title)}
                        className={cn('truncate font-semibold', title === '' && 'text-muted-foreground')}
                      >
                        {title === '' ? t('write.untitled') : title}
                      </div>
                      {snippet !== '' && (
                        <div
                          lang={detectLanguage(snippet)}
                          className="mt-0.5 line-clamp-2 text-xs text-muted-foreground"
                        >
                          {snippet}
                        </div>
                      )}
                      <Badge variant={page ? 'secondary' : 'outline'} className="mt-2">
                        {page ? t('write.placed', { page }) : t('write.unplaced')}
                      </Badge>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                      aria-label={t('write.delete')}
                      title={t('write.delete')}
                      onClick={() => onDelete(article)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

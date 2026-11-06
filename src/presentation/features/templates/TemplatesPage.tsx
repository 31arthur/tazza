import { useState, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { LibraryItem } from '@domain/entities/LibraryItem';
import { PALETTE, resolveMasthead } from '@domain/layout/style';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  useEdition,
  useEditionId,
  useLayoutActions,
  useLibrary,
  useLibraryActions,
} from '../queries';
import { TemplateThumb } from './TemplateThumb';

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{hint}</p>
      {children}
    </section>
  );
}

/** The newsroom's reusable pieces: page and edition templates, saved tile styles, brand kit. */
export function TemplatesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const editionId = useEditionId();
  const { data: edition } = useEdition();
  const { data: library = [] } = useLibrary();
  const actions = useLayoutActions();
  const libraryActions = useLibraryActions();
  const [targetPage, setTargetPage] = useState(1);

  const remove = (item: LibraryItem) => {
    if (window.confirm(t('templates.confirmDelete', { name: item.name }))) {
      void libraryActions.deleteItem(item.id);
    }
  };

  const pageTemplates = library.filter((i) => i.kind === 'pageTemplate');
  const editionTemplates = library.filter((i) => i.kind === 'editionTemplate');
  const tileStyles = library.filter((i) => i.kind === 'tileStyle');
  const brandKit = library.find((i) => i.kind === 'brandKit');

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-1 text-2xl font-bold">{t('templates.title')}</h1>
        <p className="mb-8 text-muted-foreground">{t('templates.intro')}</p>

        <Section title={t('templates.pageTemplates')} hint={t('templates.pageHint')}>
          {pageTemplates.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('templates.emptyPages')}</p>
          )}
          <div className="flex flex-wrap gap-6">
            {pageTemplates.map(
              (item) =>
                item.kind === 'pageTemplate' && (
                  <div key={item.id} className="flex w-52 flex-col gap-2">
                    <TemplateThumb data={item.page} editionId={editionId} masthead={edition?.masthead} />
                    <div className="font-semibold">{item.name}</div>
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={t('templates.targetPage')}
                        className="h-8 rounded-md border bg-transparent px-2 text-sm"
                        value={targetPage}
                        onChange={(e) => setTargetPage(Number(e.target.value))}
                      >
                        {(edition?.pages ?? []).map((p) => (
                          <option key={p.number} value={p.number}>
                            {t('layout.page', { n: p.number })}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (await actions.applyPageTemplate(targetPage, item.id)) {
                            void navigate('/layout');
                          }
                        }}
                      >
                        {t('templates.apply')}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={t('templates.delete')}
                        onClick={() => remove(item)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ),
            )}
          </div>
        </Section>

        <Section title={t('templates.editionTemplates')} hint={t('templates.editionHint')}>
          {editionTemplates.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('templates.emptyEditions')}</p>
          )}
          <div className="flex flex-wrap gap-6">
            {editionTemplates.map((item) => {
              const first = item.kind === 'editionTemplate' ? item.pages[0] : undefined;
              return (
                item.kind === 'editionTemplate' && (
                  <div key={item.id} className="flex w-52 flex-col gap-2">
                    {first && (
                      <TemplateThumb data={first} editionId={editionId} masthead={item.masthead} />
                    )}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{item.name}</span>
                      <Badge variant="secondary">
                        {t('templates.pageCount', { count: item.pages.length })}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (!window.confirm(t('templates.confirmUseEdition'))) return;
                          if (await actions.applyEditionTemplate(item.id)) void navigate('/layout');
                        }}
                      >
                        {t('templates.useForEdition')}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={t('templates.delete')}
                        onClick={() => remove(item)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                )
              );
            })}
          </div>
        </Section>

        <Section title={t('templates.tileStyles')} hint={t('templates.styleHint')}>
          {tileStyles.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('templates.emptyStyles')}</p>
          )}
          <ul className="flex flex-col gap-2">
            {tileStyles.map(
              (item) =>
                item.kind === 'tileStyle' && (
                  <li key={item.id} className="flex items-center gap-3 rounded-md border bg-card p-2">
                    <span
                      className="size-4 rounded-full border"
                      style={{ background: PALETTE[item.style.accent ?? 'blue'] }}
                    />
                    <span className="font-medium">{item.name}</span>
                    <Badge variant="outline">{t(`layout.roles.${item.role}`)}</Badge>
                    <Button
                      className="ml-auto"
                      size="icon"
                      variant="ghost"
                      aria-label={t('templates.delete')}
                      onClick={() => remove(item)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ),
            )}
          </ul>
        </Section>

        <Section title={t('templates.brandKit')} hint={t('templates.brandHint')}>
          {brandKit?.kind === 'brandKit' ? (
            <div className="flex items-center gap-4 rounded-md border bg-card p-4">
              <span
                className="text-3xl font-black"
                style={{ color: PALETTE[resolveMasthead(brandKit.masthead).color] }}
              >
                {resolveMasthead(brandKit.masthead).title}
              </span>
              <span className="text-sm text-muted-foreground">
                {resolveMasthead(brandKit.masthead).titleEn} ·{' '}
                {resolveMasthead(brandKit.masthead).tagline}
              </span>
              <Button
                className="ml-auto"
                size="icon"
                variant="ghost"
                aria-label={t('templates.delete')}
                onClick={() => remove(brandKit)}
              >
                <Trash2 />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('templates.emptyBrand')}</p>
          )}
        </Section>
      </div>
    </div>
  );
}

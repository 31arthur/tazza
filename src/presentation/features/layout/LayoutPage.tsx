import { useMemo, useState } from 'react';
import { LayoutGrid, Plus, Trash2, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { placedArticleIds } from '@domain/entities/Edition';
import { detectLanguage } from '@domain/services/detectLanguage';
import { gridRows, GRID, type GridPlacement } from '@domain/services/PageGeometry';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useFitScale } from '../../hooks/useFitScale';
import { cn } from '../../lib/utils';
import { PageRenderer } from '../../print/PageRenderer';
import { ScaledPage } from '../../print/ScaledPage';
import { useArticles, useEdition, useEditionId, useLayoutActions } from '../queries';
import { EditableBlock } from './EditableBlock';

type Field = keyof GridPlacement;

export function LayoutPage() {
  const { t } = useTranslation();
  const editionId = useEditionId();
  const { data: edition } = useEdition();
  const { data: articleList = [] } = useArticles();
  const actions = useLayoutActions();
  const { ref, scale: fit } = useFitScale(64);
  const [zoom, setZoom] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedBlockId, setSelectedBlockId] = useState<string | undefined>();

  const articles = useMemo(() => new Map(articleList.map((a) => [a.id, a])), [articleList]);
  if (!edition) return null;

  const page = edition.pages.find((p) => p.number === pageNumber) ?? edition.pages[0];
  if (!page) return null;

  const placed = placedArticleIds(edition);
  const unplaced = articleList.filter((a) => !placed.has(a.id));
  const selectedBlock = page.blocks.find((b) => b.id === selectedBlockId);
  const selectedArticle = selectedBlock ? articles.get(selectedBlock.articleId) : undefined;
  const scale = fit * zoom;

  const setField = (field: Field, value: number) => {
    if (!selectedBlock || Number.isNaN(value)) return;
    void actions.updateBlock(page.number, selectedBlock.id, {
      ...selectedBlock.placement,
      [field]: value,
    });
  };

  const fieldInputs: { field: Field; label: string; min: number; max: number; offset: number }[] = [
    { field: 'col', label: t('layout.column'), min: 1, max: GRID.columns, offset: 1 },
    { field: 'colSpan', label: t('layout.columns'), min: 1, max: GRID.columns, offset: 0 },
    { field: 'row', label: t('layout.row'), min: 1, max: gridRows(page.number), offset: 1 },
    { field: 'rowSpan', label: t('layout.rows'), min: 1, max: gridRows(page.number), offset: 0 },
  ];

  return (
    <div className="grid h-full grid-cols-[17rem_1fr_15rem]">
      {/* Left: unplaced stories */}
      <aside className="flex flex-col border-r bg-card">
        <div className="flex flex-col gap-2 border-b p-3">
          <Button onClick={() => void actions.autoLayout()} disabled={unplaced.length === 0}>
            <Wand2 /> {t('layout.autoLayout')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (window.confirm(t('layout.confirmClear'))) {
                setSelectedBlockId(undefined);
                setPageNumber(1);
                void actions.clearLayout();
              }
            }}
          >
            <Trash2 /> {t('layout.clear')}
          </Button>
        </div>
        <h2 className="px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('layout.unplaced')} ({unplaced.length})
        </h2>
        <ul className="flex-1 overflow-y-auto p-2">
          {unplaced.length === 0 && (
            <li className="p-2 text-sm text-muted-foreground">
              {articleList.length === 0 ? (
                <>
                  {t('write.empty')}{' '}
                  <Link className="underline" to="/write">
                    {t('nav.write')}
                  </Link>
                </>
              ) : (
                t('layout.allPlaced')
              )}
            </li>
          )}
          {unplaced.map((a) => (
            <li key={a.id} className="mb-2 rounded-md border p-2">
              <div lang={detectLanguage(a.headline)} className="truncate text-sm font-semibold">
                {a.headline.trim() === '' ? t('write.untitled') : a.headline}
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="mt-2 w-full"
                onClick={() => void actions.placeArticle(page.number, a.id)}
              >
                {t('layout.placeOnPage', { page: page.number })}
              </Button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Centre: page tabs + canvas */}
      <section className="flex min-w-0 flex-col">
        <div className="flex items-center gap-2 border-b bg-card p-2">
          <LayoutGrid className="size-4 text-muted-foreground" />
          {edition.pages.map((p) => (
            <Button
              key={p.number}
              size="sm"
              variant={p.number === page.number ? 'default' : 'outline'}
              onClick={() => {
                setPageNumber(p.number);
                setSelectedBlockId(undefined);
              }}
            >
              {p.number}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => void actions.addPage()}>
            <Plus /> {t('layout.addPage')}
          </Button>
          {edition.pages.length > 1 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedBlockId(undefined);
                setPageNumber(Math.max(1, page.number - 1));
                void actions.removePage(page.number);
              }}
            >
              <Trash2 /> {t('layout.removePage')}
            </Button>
          )}
          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            {t('layout.zoom')}
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>
        </div>
        <div
          ref={ref}
          className="flex-1 overflow-auto bg-neutral-200 p-8"
          onPointerDown={() => setSelectedBlockId(undefined)}
        >
          <div className="mx-auto w-fit">
            <ScaledPage scale={scale}>
              <PageRenderer
                page={page}
                editionId={editionId}
                articles={articles}
                renderBlock={(args) => (
                  <EditableBlock
                    {...args}
                    pageNumber={page.number}
                    siblings={page.blocks}
                    selected={args.block.id === selectedBlockId}
                    scale={scale}
                    overflowText={t('layout.overflow')}
                    onSelect={() => setSelectedBlockId(args.block.id)}
                    onCommit={(placement) =>
                      void actions.updateBlock(page.number, args.block.id, placement)
                    }
                  />
                )}
              />
            </ScaledPage>
          </div>
        </div>
      </section>

      {/* Right: inspector */}
      <aside className="border-l bg-card p-3">
        {selectedBlock ? (
          <div className="flex flex-col gap-3">
            <div
              lang={detectLanguage(selectedArticle?.headline ?? '')}
              className="font-semibold"
            >
              {selectedArticle?.headline.trim() || t('write.untitled')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {fieldInputs.map(({ field, label, min, max, offset }) => (
                <label key={field} className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {label}
                  <Input
                    type="number"
                    min={min}
                    max={max}
                    value={selectedBlock.placement[field] + offset}
                    onChange={(e) => setField(field, Number(e.target.value) - offset)}
                  />
                </label>
              ))}
            </div>
            {edition.pages.length > 1 && (
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                {t('layout.moveToPage')}
                <select
                  className="h-9 rounded-md border bg-transparent px-2 text-sm text-foreground"
                  value={page.number}
                  onChange={(e) => {
                    const target = Number(e.target.value);
                    setSelectedBlockId(undefined);
                    void actions.placeArticle(target, selectedBlock.articleId).then((ok) => {
                      if (ok) setPageNumber(target);
                    });
                  }}
                >
                  {edition.pages.map((p) => (
                    <option key={p.number} value={p.number}>
                      {t('layout.page', { n: p.number })}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Button
              variant="outline"
              onClick={() => {
                void actions.removeBlock(selectedBlock.id);
                setSelectedBlockId(undefined);
              }}
            >
              {t('layout.remove')}
            </Button>
          </div>
        ) : (
          <p className={cn('text-sm text-muted-foreground')}>{t('layout.hint')}</p>
        )}
      </aside>
    </div>
  );
}

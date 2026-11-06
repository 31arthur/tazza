import { useMemo, useRef, useState } from 'react';
import { GripVertical, LayoutGrid, Plus, Trash2, Wand2, Maximize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { placedArticleIds } from '@domain/entities/Edition';
import { pageFill } from '@domain/layout/fit';
import { resolveMasthead } from '@domain/layout/style';
import { TEMPLATE_IDS, type TemplateId } from '@domain/layout/templates';
import { layoutRects, leavesOf, type SlotRole } from '@domain/layout/tree';
import { detectLanguage } from '@domain/services/detectLanguage';
import { Button } from '../../components/ui/button';
import { useFitScale } from '../../hooks/useFitScale';
import { cn } from '../../lib/utils';
import { PageRenderer } from '../../print/PageRenderer';
import { ScaledPage } from '../../print/ScaledPage';
import { useArticles, useEdition, useEditionId, useLayoutActions } from '../queries';
import { DividerHandle } from './DividerHandle';
import { EditableLeaf } from './EditableLeaf';
import { ElementPalette } from './ElementPalette';
import { ElementPanel } from './ElementPanel';
import { MastheadPanel } from './MastheadPanel';
import { StylePanel } from './StylePanel';
import { useLayoutDnd, type DragSource, type DropTarget } from './useLayoutDnd';

const ROLES: SlotRole[] = ['banner', 'lead', 'story', 'box', 'brief', 'teaser'];

const selectClass = 'h-9 w-full rounded-md border bg-transparent px-2 text-sm text-foreground';

/** Part of a tile that a drop would take over, in page millimetres. */
const zoneRect = (rect: { x: number; y: number; w: number; h: number }, zone: DropTarget['zone']) => {
  switch (zone) {
    case 'left':
      return { ...rect, w: rect.w / 2 };
    case 'right':
      return { ...rect, x: rect.x + rect.w / 2, w: rect.w / 2 };
    case 'top':
      return { ...rect, h: rect.h / 2 };
    case 'bottom':
      return { ...rect, y: rect.y + rect.h / 2, h: rect.h / 2 };
    case 'center':
      return rect;
  }
};

export function LayoutPage() {
  const { t } = useTranslation();
  const editionId = useEditionId();
  const { data: edition } = useEdition();
  const { data: articleList = [] } = useArticles();
  const actions = useLayoutActions();
  const { ref, scale: fit } = useFitScale(64);
  const pageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedLeafId, setSelectedLeafId] = useState<string | undefined>();
  const scale = fit * zoom;

  const articles = useMemo(() => new Map(articleList.map((a) => [a.id, a])), [articleList]);
  const page = edition?.pages.find((p) => p.number === pageNumber) ?? edition?.pages[0];
  const rects = useMemo(
    () => (page ? layoutRects(page.layout, page.number) : { leaves: [], dividers: [] }),
    [page],
  );

  const dnd = useLayoutDnd({
    pageRef,
    scale,
    leaves: rects.leaves,
    onDrop: (source: DragSource, target: DropTarget) => {
      if (!page) return;
      if (source.elementKind) {
        void actions.addElement(page.number, {
          kind: source.elementKind,
          targetLeafId: target.leafId,
          zone: target.zone,
        });
        return;
      }
      void actions.dropArticle(page.number, {
        targetLeafId: target.leafId,
        zone: target.zone,
        ...(source.articleId && { articleId: source.articleId }),
        ...(source.fromLeafId && { fromLeafId: source.fromLeafId }),
      });
    },
  });

  if (!edition || !page) return null;

  const placed = placedArticleIds(edition);
  const unplaced = articleList.filter((a) => !placed.has(a.id));
  const selectedLeaf = leavesOf(page.layout).find((l) => l.id === selectedLeafId);
  const selectedArticle = selectedLeaf?.articleId ? articles.get(selectedLeaf.articleId) : undefined;
  const fill = pageFill(page.layout, page.number, (id) => articles.get(id));
  const fillPct = Math.round(fill * 100);
  const hasStories = leavesOf(page.layout).some((l) => l.articleId);

  const goToPage = (n: number) => {
    setPageNumber(n);
    setSelectedLeafId(undefined);
  };

  return (
    <div className="grid h-full grid-cols-[17rem_1fr_15rem]">
      {/* Left: tools and unplaced stories */}
      <aside className="flex min-h-0 flex-col border-r bg-card">
        <div className="flex flex-col gap-2 border-b p-3">
          <Button onClick={() => void actions.autoLayout()} disabled={unplaced.length === 0}>
            <Wand2 /> {t('layout.autoLayout')}
          </Button>
          <Button variant="outline" onClick={() => void actions.autoFitPage(page.number)}>
            <Maximize2 /> {t('layout.autoFit')}
          </Button>
          <select
            aria-label={t('layout.template')}
            className={selectClass}
            value=""
            onChange={(e) => {
              if (e.target.value) void actions.applyTemplate(page.number, e.target.value as TemplateId);
            }}
          >
            <option value="">{t('layout.template')}</option>
            {TEMPLATE_IDS.map((id) => (
              <option key={id} value={id}>
                {t(`layout.templates.${id}`)}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            onClick={() => {
              if (window.confirm(t('layout.confirmClear'))) {
                setSelectedLeafId(undefined);
                setPageNumber(1);
                void actions.clearLayout();
              }
            }}
          >
            <Trash2 /> {t('layout.clear')}
          </Button>
        </div>
        <ElementPalette
          onStartDrag={dnd.start}
          onAdd={(kind) => void actions.addElement(page.number, { kind })}
        />
        <h2 className="px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('layout.unplaced')} ({unplaced.length})
        </h2>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
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
            <li
              key={a.id}
              onPointerDown={(e) =>
                dnd.start(e, { articleId: a.id, label: a.headline.trim() || t('write.untitled') })
              }
              className="mb-2 cursor-grab touch-none select-none rounded-md border bg-background p-2 active:cursor-grabbing"
            >
              <div className="flex items-start gap-1">
                <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div
                  lang={detectLanguage(a.headline)}
                  className="line-clamp-2 text-sm font-semibold"
                >
                  {a.headline.trim() === '' ? t('write.untitled') : a.headline}
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="mt-2 w-full"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => void actions.placeArticle(page.number, a.id)}
              >
                {t('layout.placeOnPage', { page: page.number })}
              </Button>
            </li>
          ))}
        </ul>
        <p className="border-t p-3 text-xs text-muted-foreground">{t('layout.dragHint')}</p>
      </aside>

      {/* Centre: page tabs + canvas */}
      <section className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b bg-card p-2">
          <LayoutGrid className="size-4 text-muted-foreground" />
          {edition.pages.map((p) => (
            <Button
              key={p.number}
              size="sm"
              variant={p.number === page.number ? 'default' : 'outline'}
              onClick={() => goToPage(p.number)}
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
                goToPage(Math.max(1, page.number - 1));
                void actions.removePage(page.number);
              }}
            >
              <Trash2 /> {t('layout.removePage')}
            </Button>
          )}
          {hasStories && (
            <span
              className={cn(
                'ml-2 rounded-full px-2 py-0.5 text-xs font-medium',
                fillPct > 100
                  ? 'bg-red-100 text-red-700'
                  : fillPct < 70
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800',
              )}
              title={t('layout.fillHint')}
            >
              {fillPct > 100
                ? t('layout.overfull', { pct: fillPct })
                : t('layout.fill', { pct: fillPct })}
            </span>
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
          onPointerDown={() => setSelectedLeafId(undefined)}
        >
          <div className="mx-auto w-fit">
            <ScaledPage scale={scale} innerRef={pageRef}>
              <PageRenderer
                page={page}
                editionId={editionId}
                masthead={resolveMasthead(edition.masthead)}
                articles={articles}
                renderLeaf={(args) => (
                  <EditableLeaf
                    {...args}
                    selected={args.placed.leaf.id === selectedLeafId}
                    dragging={dnd.drag?.source.fromLeafId === args.placed.leaf.id}
                    overflowText={t('layout.overflow')}
                    emptyText={t('layout.emptySlot')}
                    onSelect={() => setSelectedLeafId(args.placed.leaf.id)}
                    onStartDrag={dnd.start}
                  />
                )}
                overlay={(leaves) => {
                  const target = dnd.drag?.target;
                  const targetRect = target
                    ? leaves.find((l) => l.leaf.id === target.leafId)?.rect
                    : undefined;
                  return (
                    <>
                      {rects.dividers.map((d) => (
                        <DividerHandle
                          key={`${d.splitId}-${d.index}`}
                          divider={d}
                          scale={scale}
                          onResize={(splitId, sizes) =>
                            void actions.resizeSplit(page.number, splitId, sizes)
                          }
                        />
                      ))}
                      {target && targetRect && (
                        <div
                          aria-hidden
                          style={{
                            position: 'absolute',
                            ...(() => {
                              const r = zoneRect(targetRect, target.zone);
                              return {
                                left: `${r.x}mm`,
                                top: `${r.y}mm`,
                                width: `${r.w}mm`,
                                height: `${r.h}mm`,
                              };
                            })(),
                            background: 'rgba(37,99,235,0.22)',
                            border: '0.6mm solid #2563eb',
                            pointerEvents: 'none',
                            zIndex: 6,
                          }}
                        />
                      )}
                    </>
                  );
                }}
              />
            </ScaledPage>
          </div>
        </div>
      </section>

      {/* Right: inspector */}
      <aside className="min-h-0 overflow-y-auto border-l bg-card p-3">
        {selectedLeaf ? (
          <div className="flex flex-col gap-3">
            <div
              lang={detectLanguage(selectedArticle?.headline ?? '')}
              className="font-semibold"
            >
              {selectedArticle
                ? selectedArticle.headline.trim() || t('write.untitled')
                : selectedLeaf.element
                  ? t(`elements.kinds.${selectedLeaf.element.type === 'text' ? 'text' : selectedLeaf.element.type}`)
                  : t('layout.emptySlot')}
            </div>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('layout.role')}
              <select
                className={selectClass}
                value={selectedLeaf.role}
                onChange={(e) =>
                  void actions.setSlotRole(page.number, selectedLeaf.id, e.target.value as SlotRole)
                }
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`layout.roles.${r}`)}
                  </option>
                ))}
              </select>
            </label>
            {selectedArticle && edition.pages.length > 1 && (
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                {t('layout.moveToPage')}
                <select
                  className={selectClass}
                  value={page.number}
                  onChange={(e) => {
                    const target = Number(e.target.value);
                    const articleId = selectedArticle.id;
                    setSelectedLeafId(undefined);
                    void actions.placeArticle(target, articleId).then((ok) => {
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
            {(selectedArticle || selectedLeaf.element) && (
              <Button
                variant="outline"
                onClick={() => {
                  void actions.clearSlot(page.number, selectedLeaf.id);
                }}
              >
                {t('layout.clearSlot')}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                void actions.removeSlot(page.number, selectedLeaf.id);
                setSelectedLeafId(undefined);
              }}
            >
              {t('layout.removeSlot')}
            </Button>
            {selectedLeaf.element && (
              <ElementPanel
                tileId={selectedLeaf.id}
                element={selectedLeaf.element}
                onChange={(element) =>
                  void actions.updateElement(page.number, selectedLeaf.id, element)
                }
              />
            )}
            <StylePanel
              leaf={selectedLeaf}
              onChange={(style) => void actions.setSlotStyle(page.number, selectedLeaf.id, style)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{t('layout.hint')}</p>
            <MastheadPanel
              key={editionId}
              settings={resolveMasthead(edition.masthead)}
              onChange={(patch) => void actions.updateMasthead(patch)}
            />
          </div>
        )}
      </aside>

      {dnd.drag && (
        <div
          lang={detectLanguage(dnd.drag.source.label)}
          className="pointer-events-none fixed z-50 max-w-60 truncate rounded-md border bg-white px-3 py-1.5 text-sm font-semibold shadow-lg"
          style={{ left: dnd.drag.x + 14, top: dnd.drag.y + 14 }}
        >
          {dnd.drag.source.label}
        </div>
      )}
    </div>
  );
}

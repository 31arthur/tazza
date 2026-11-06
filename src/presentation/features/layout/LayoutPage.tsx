import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Columns3,
  GripVertical,
  LayoutGrid,
  Maximize2,
  Plus,
  Redo2,
  Trash2,
  Undo2,
  Wand2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { masterObjectsFor, placedArticleIds } from '@domain/entities/Edition';
import { pageFill } from '@domain/layout/fit';
import { flowSlices, type FlowSlice } from '@domain/layout/flow';
import { resolveMasthead } from '@domain/layout/style';
import { TEMPLATE_IDS, type TemplateId } from '@domain/layout/templates';
import { layoutRects, leavesOf, makeLeaf, type SlotRole } from '@domain/layout/tree';
import { GRID } from '@domain/services/PageGeometry';
import { detectLanguage } from '@domain/services/detectLanguage';
import { Button } from '../../components/ui/button';
import { useFitScale } from '../../hooks/useFitScale';
import { PX_PER_MM } from '../../lib/units';
import { cn } from '../../lib/utils';
import { PageRenderer } from '../../print/PageRenderer';
import { ScaledPage } from '../../print/ScaledPage';
import {
  useArticles,
  useEdition,
  useEditionId,
  useLayoutActions,
  useLibrary,
  useLibraryActions,
  useUndoRedo,
} from '../queries';
import { ColumnGuides } from './ColumnGuides';
import { ContinuePanel } from './ContinuePanel';
import { DividerHandle } from './DividerHandle';
import { EditableLeaf } from './EditableLeaf';
import { ElementPalette } from './ElementPalette';
import { ElementPanel } from './ElementPanel';
import { LayersPanel } from './LayersPanel';
import { MasterBar } from './MasterBar';
import { MastheadPanel } from './MastheadPanel';
import { MultiPanel } from './MultiPanel';
import { ObjectPalette } from './ObjectPalette';
import { ObjectPanel } from './ObjectPanel';
import { ObjectsEditor } from './ObjectsEditor';
import { GuidesLayer, RULER_PX, Ruler } from './Rulers';
import { StylePanel } from './StylePanel';
import { useGuideDrag } from './useGuideDrag';
import { useLayoutDnd, type DragSource, type DropTarget } from './useLayoutDnd';
import { useObjectSelection } from './useObjectSelection';

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
  const [editingMasterId, setEditingMasterId] = useState<string | undefined>();
  const actions = useLayoutActions(editingMasterId);
  const { data: library = [] } = useLibrary();
  const libraryActions = useLibraryActions();
  const { ref, scale: fit } = useFitScale(64);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [pageElement, setPageElement] = useState<HTMLDivElement | null>(null);
  const setPageNode = useCallback((el: HTMLDivElement | null) => {
    pageRef.current = el;
    setPageElement(el);
  }, []);
  const [zoom, setZoom] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedLeafId, setSelectedLeafId] = useState<string | undefined>();
  const [guides, setGuides] = useState(false);
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const scale = fit * zoom;

  const articles = useMemo(() => new Map(articleList.map((a) => [a.id, a])), [articleList]);
  const flow = useMemo(
    () => (edition ? flowSlices(edition, (id) => articles.get(id)) : new Map<string, FlowSlice>()),
    [edition, articles],
  );
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

  // While a master is edited the canvas shows only that master's objects, as an empty page.
  const masterBeingEdited = edition?.masters?.find((m) => m.id === editingMasterId);
  const viewPage =
    page && masterBeingEdited
      ? { ...page, layout: makeLeaf('master-blank'), objects: masterBeingEdited.objects, guides: [] }
      : page;
  const objs = useObjectSelection({ page: viewPage, scale, pageElement, actions });
  const rulerGuides = viewPage?.guides ?? [];
  const guideDrag = useGuideDrag({
    pageElement,
    scale,
    guides: rulerGuides,
    onCommit: (next) => {
      if (page) void actions.setGuides(page.number, next);
    },
  });

  const selectLeaf = (id: string | undefined) => {
    setSelectedLeafId(id);
    objs.clear();
  };
  const selectObjects = (ids: string[]) => {
    setSelectedLeafId(undefined);
    objs.select(ids);
  };

  // Keyboard shortcuts, as in a desktop layout tool. They never fire while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLElement &&
        e.target.matches('input, textarea, select, [contenteditable="true"]');
      if (typing) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (objs.handleKey(e)) return;
      if (mod && key === 'z') {
        e.preventDefault();
        void (e.shiftKey ? redo() : undo());
      } else if (mod && key === 'y') {
        e.preventDefault();
        void redo();
      } else if (e.key === 'Escape') {
        setSelectedLeafId(undefined);
        objs.clear();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLeafId && page) {
        e.preventDefault();
        void (e.shiftKey
          ? actions.removeSlot(page.number, selectedLeafId)
          : actions.clearSlot(page.number, selectedLeafId));
        if (e.shiftKey) setSelectedLeafId(undefined);
      } else if (!mod && key === 'g') {
        setGuides((g) => !g);
      } else if (!mod && (e.key === '+' || e.key === '=')) {
        setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 100) / 100));
      } else if (!mod && e.key === '-') {
        setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 100) / 100));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
    objs.clear();
  };

  const view = viewPage ?? page;
  const pageObjects = view.objects ?? [];
  const masters = edition.masters ?? [];
  const pageTemplates = library.filter((item) => item.kind === 'pageTemplate');

  const startEditingMaster = (id: string) => {
    setEditingMasterId(id);
    setSelectedLeafId(undefined);
    objs.clear();
  };
  const stopEditingMaster = () => {
    setEditingMasterId(undefined);
    objs.clear();
  };
  const createMasterFromPage = async () => {
    const name = window.prompt(t('masters.namePrompt'));
    if (name === null) return;
    await actions.createMaster(name, page.number);
  };
  const renameMaster = (id: string) => {
    const name = window.prompt(t('masters.namePrompt'), masters.find((m) => m.id === id)?.name);
    if (name) void actions.renameMaster(id, name);
  };
  const deleteMaster = (id: string) => {
    if (!window.confirm(t('masters.confirmDelete'))) return;
    stopEditingMaster();
    void actions.deleteMaster(id);
  };
  const addObject = async (tool: Parameters<typeof actions.addObject>[1]) => {
    const id = await actions.addObject(page.number, tool);
    if (id) selectObjects([id]);
  };

  return (
    <div className="grid h-full grid-cols-[17rem_1fr_15rem]">
      {/* Left: tools and unplaced stories */}
      <aside className="flex min-h-0 flex-col overflow-y-auto border-r bg-card">
        {!masterBeingEdited && (
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
          {pageTemplates.length > 0 && (
            <select
              aria-label={t('templates.applyToPage')}
              className={selectClass}
              value=""
              onChange={(e) => {
                if (e.target.value) void actions.applyPageTemplate(page.number, e.target.value);
              }}
            >
              <option value="">{t('templates.applyToPage')}</option>
              {pageTemplates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                const name = window.prompt(t('templates.pageName'));
                if (name !== null) void libraryActions.savePageTemplate(page.number, name);
              }}
            >
              {t('templates.savePage')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                const name = window.prompt(t('templates.editionName'));
                if (name !== null) void libraryActions.saveEditionTemplate(name);
              }}
            >
              {t('templates.saveEdition')}
            </Button>
          </div>
        </div>
        )}
        {!masterBeingEdited && (
          <ElementPalette
            onStartDrag={dnd.start}
            onAdd={(kind) => void actions.addElement(page.number, { kind })}
          />
        )}
        <ObjectPalette onAdd={(tool) => void addObject(tool)} />
        <LayersPanel
          objects={pageObjects}
          selectedIds={objs.selectedIds}
          onSelect={(id, additive) => {
            setSelectedLeafId(undefined);
            objs.pick(id, additive);
          }}
          onPatch={(id, patch) => void actions.updateObject(page.number, id, patch)}
          onArrange={(id, op) => void actions.reorderObjects(page.number, [id], op)}
        />
        <h2 className="px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('layout.unplaced')} ({unplaced.length})
        </h2>
        <ul className="max-h-64 shrink-0 overflow-y-auto p-2">
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
        <p className="border-t p-3 text-[11px] text-muted-foreground">{t('layout.shortcuts')}</p>
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
          <div className="ml-2 flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              disabled={!canUndo}
              aria-label={t('layout.undo')}
              title={`${t('layout.undo')} (Ctrl+Z)`}
              onClick={() => void undo()}
            >
              <Undo2 />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              disabled={!canRedo}
              aria-label={t('layout.redo')}
              title={`${t('layout.redo')} (Ctrl+Y)`}
              onClick={() => void redo()}
            >
              <Redo2 />
            </Button>
            <Button
              size="icon"
              variant={guides ? 'secondary' : 'ghost'}
              aria-pressed={guides}
              aria-label={t('layout.guides')}
              title={`${t('layout.guides')} (G)`}
              onClick={() => setGuides((g) => !g)}
            >
              <Columns3 />
            </Button>
            {rulerGuides.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void actions.setGuides(page.number, [])}
              >
                {t('objects.clearGuides')}
              </Button>
            )}
          </div>
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
          <MasterBar
            masters={masters}
            assignedId={page.masterId}
            editingId={editingMasterId}
            onAssign={(id) => void actions.assignMaster(page.number, id)}
            onCreateFromPage={() => void createMasterFromPage()}
            onEdit={startEditingMaster}
            onDone={stopEditingMaster}
            onRename={renameMaster}
            onDelete={deleteMaster}
          />
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
          onPointerDown={(e) => {
            setSelectedLeafId(undefined);
            objs.startMarquee(e, e.shiftKey);
          }}
        >
          <div
            className="mx-auto"
            style={{
              position: 'relative',
              width: GRID.pageWidthMm * PX_PER_MM * scale + RULER_PX,
              paddingLeft: RULER_PX,
              paddingTop: RULER_PX,
            }}
          >
            <Ruler axis="x" scale={scale} onStartGuide={(axis, e) => guideDrag.start(axis, null, e)} />
            <Ruler axis="y" scale={scale} onStartGuide={(axis, e) => guideDrag.start(axis, null, e)} />
            <ScaledPage scale={scale} innerRef={setPageNode}>
              <PageRenderer
                page={view}
                editionId={editionId}
                masthead={resolveMasthead(edition.masthead)}
                articles={articles}
                masterObjects={masterBeingEdited ? undefined : masterObjectsFor(edition, page)}
                flow={flow}
                objectsDraft={objs.draft}
                renderLeaf={(args) =>
                  masterBeingEdited ? null : (
                  <EditableLeaf
                    {...args}
                    selected={args.placed.leaf.id === selectedLeafId}
                    dragging={dnd.drag?.source.fromLeafId === args.placed.leaf.id}
                    overflowText={t('layout.overflow')}
                    emptyText={t('layout.emptySlot')}
                    onSelect={() => selectLeaf(args.placed.leaf.id)}
                    onStartDrag={dnd.start}
                  />
                  )
                }
                overlay={(leaves) => {
                  const target = dnd.drag?.target;
                  const targetRect = target
                    ? leaves.find((l) => l.leaf.id === target.leafId)?.rect
                    : undefined;
                  return (
                    <>
                      {guides && <ColumnGuides pageNumber={page.number} />}
                      {(masterBeingEdited ? [] : rects.dividers).map((d) => (
                        <DividerHandle
                          key={`${d.splitId}-${d.index}`}
                          divider={d}
                          scale={scale}
                          onResize={(splitId, sizes) =>
                            void actions.resizeSplit(page.number, splitId, sizes)
                          }
                        />
                      ))}
                      <ObjectsEditor
                        objects={pageObjects}
                        pageNumber={page.number}
                        scale={scale}
                        pageElement={pageElement}
                        customGuides={rulerGuides}
                        selectedIds={objs.selectedIds}
                        draft={objs.draft}
                        onSelect={selectObjects}
                        onDraft={objs.setDraft}
                        onCommit={(updates) => void actions.updateObjects(page.number, updates)}
                      />
                      <GuidesLayer
                        guides={rulerGuides}
                        draft={guideDrag.draft}
                        scale={scale}
                        onStartGuide={(axis, index, e) => guideDrag.start(axis, index, e)}
                      />
                      {objs.marquee && (
                        <div
                          aria-hidden
                          style={{
                            position: 'absolute',
                            left: `${objs.marquee.x}mm`,
                            top: `${objs.marquee.y}mm`,
                            width: `${objs.marquee.w}mm`,
                            height: `${objs.marquee.h}mm`,
                            background: 'rgba(37,99,235,0.12)',
                            border: '0.3mm dashed #2563eb',
                            pointerEvents: 'none',
                            zIndex: 9,
                          }}
                        />
                      )}
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
        {objs.selected.length > 1 ? (
          <MultiPanel
            objects={objs.selected}
            onAlign={(mode, to) => void actions.alignObjects(page.number, objs.selectedIds, mode, to)}
            onDistribute={(axis) =>
              void actions.distributeObjects(page.number, objs.selectedIds, axis)
            }
            onGroup={() => void actions.groupObjects(page.number, objs.selectedIds)}
            onUngroup={() => void actions.ungroupObjects(page.number, objs.selectedIds)}
            onArrange={(op) => void actions.reorderObjects(page.number, objs.selectedIds, op)}
            onDuplicate={() =>
              void actions
                .duplicateObjects(page.number, objs.selectedIds)
                .then((ids) => ids && objs.select(ids))
            }
            onRemove={() => {
              void actions.removeObjects(page.number, objs.selectedIds);
              objs.clear();
            }}
          />
        ) : objs.selected[0] ? (
          <ObjectPanel
            object={objs.selected[0]}
            onPatch={(patch) =>
              void actions.updateObject(page.number, objs.selectedIds[0] ?? '', patch)
            }
            onAlign={(mode, to) => void actions.alignObjects(page.number, objs.selectedIds, mode, to)}
            onArrange={(op) => void actions.reorderObjects(page.number, objs.selectedIds, op)}
            onDuplicate={() =>
              void actions
                .duplicateObjects(page.number, objs.selectedIds)
                .then((ids) => ids && objs.select(ids))
            }
            onRemove={() => {
              void actions.removeObjects(page.number, objs.selectedIds);
              objs.clear();
            }}
          />
        ) : selectedLeaf ? (
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
            {selectedArticle && (
              <ContinuePanel
                key={selectedLeaf.id}
                leaf={selectedLeaf}
                slice={flow.get(selectedLeaf.id)}
                pageNumbers={edition.pages.map((p) => p.number)}
                currentPage={page.number}
                onContinue={(to) => void actions.continueStory(page.number, selectedLeaf.id, to)}
                onUnlink={(id) => void actions.unlinkContinuation(id)}
              />
            )}
            {selectedLeaf.element && (
              <ElementPanel
                tileId={selectedLeaf.id}
                element={selectedLeaf.element}
                frameMm={rects.leaves.find((l) => l.leaf.id === selectedLeaf.id)?.rect}
                onChange={(element) =>
                  void actions.updateElement(page.number, selectedLeaf.id, element)
                }
              />
            )}
            <StylePanel
              leaf={selectedLeaf}
              onChange={(style) => void actions.setSlotStyle(page.number, selectedLeaf.id, style)}
              onApplySaved={(role, style) =>
                void actions.setSlotStyle(page.number, selectedLeaf.id, style, role)
              }
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

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Asset, AssetMeta } from '@domain/entities/Asset';
import type { Edition } from '@domain/entities/Edition';
import type { ArticleStatus } from '@domain/entities/Workflow';
import type { Element, ElementKind } from '@domain/layout/element';
import type { AlignMode, ArrangeOp, ObjectPatch, ObjectTool } from '@domain/layout/objects';
import type { AlignTarget, DistributeAxis, IdPatch } from '@domain/layout/selection';
import type { Guide } from '@domain/layout/snapping';
import type { TemplateId } from '@domain/layout/templates';
import type { LeafStyle, Masthead } from '@domain/layout/style';
import type { SlotRole } from '@domain/layout/tree';
import type { DropZone } from '@domain/usecases/layout/DropArticle';
import { useUseCases } from '../hooks/AppContext';
import { checkFonts } from '../lib/fonts';
import { isImageFile, prepareImage } from '../lib/image';
import { useEditionStore } from '../state/editionStore';
import { useHistoryStore } from '../state/historyStore';
import { useActor } from '../state/workStore';

export const editionKey = (id: string) => ['edition', id] as const;
export const articlesKey = (id: string) => ['articles', id] as const;

export function useEditionId(): string {
  return useEditionStore((s) => s.editionId);
}

export function useEdition() {
  const editionId = useEditionId();
  const { getOrCreateEdition } = useUseCases();
  return useQuery({
    queryKey: editionKey(editionId),
    queryFn: () => getOrCreateEdition.execute({ editionId }),
    enabled: editionId !== '',
  });
}

export function useArticles() {
  const editionId = useEditionId();
  const { listArticles } = useUseCases();
  return useQuery({
    queryKey: articlesKey(editionId),
    queryFn: () => listArticles.execute({ editionId }),
    enabled: editionId !== '',
  });
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : 'Something went wrong';

export interface DropRequest {
  targetLeafId: string;
  zone: DropZone;
  articleId?: string;
  fromLeafId?: string;
}

/** Layout commands: run the use case, refresh the cached edition, toast domain errors. */
export function useLayoutActions(masterId?: string) {
  const editionId = useEditionId();
  const uc = useUseCases();
  const queryClient = useQueryClient();
  /** While a master is being edited, object commands act on the master, not the page. */
  const masterPart = masterId ? { masterId } : {};

  const apply = useCallback(
    async (run: () => Promise<Edition>): Promise<boolean> => {
      try {
        const before = queryClient.getQueryData<Edition>(editionKey(editionId));
        const after = await run();
        if (before) useHistoryStore.getState().record(editionId, before);
        queryClient.setQueryData(editionKey(editionId), after);
        return true;
      } catch (error) {
        toast.error(messageOf(error));
        return false;
      }
    },
    [editionId, queryClient],
  );

  return {
    autoLayout: () => apply(() => uc.autoLayout.execute({ editionId })),
    clearLayout: () => apply(() => uc.clearLayout.execute({ editionId })),
    addPage: (templateId?: TemplateId) =>
      apply(() => uc.addPage.execute({ editionId, ...(templateId && { templateId }) })),
    removePage: (pageNumber: number) =>
      apply(() => uc.removePage.execute({ editionId, pageNumber })),
    applyTemplate: (pageNumber: number, templateId: TemplateId) =>
      apply(() => uc.applyTemplate.execute({ editionId, pageNumber, templateId })),
    placeArticle: (pageNumber: number, articleId: string) =>
      apply(() => uc.placeArticle.execute({ editionId, pageNumber, articleId })),
    dropArticle: (pageNumber: number, drop: DropRequest) =>
      apply(() => uc.dropArticle.execute({ editionId, pageNumber, ...drop })),
    addElement: (
      pageNumber: number,
      request: { kind: ElementKind; targetLeafId?: string; zone?: DropZone },
    ) => apply(() => uc.addElement.execute({ editionId, pageNumber, ...request })),
    updateElement: (pageNumber: number, leafId: string, element: Element) =>
      apply(() => uc.updateElement.execute({ editionId, pageNumber, leafId, element })),
    /** Adds an object; resolves to its id so the caller can select it. */
    addObject: async (pageNumber: number, tool: ObjectTool): Promise<string | undefined> => {
      let id: string | undefined;
      const ok = await apply(async () => {
        const result = await uc.addObject.execute({ editionId, pageNumber, ...masterPart, tool });
        id = result.objectId;
        return result.edition;
      });
      return ok ? id : undefined;
    },
    /** Duplicates objects; resolves to the ids of the copies. */
    duplicateObjects: async (
      pageNumber: number,
      objectIds: readonly string[],
    ): Promise<string[] | undefined> => {
      let ids: string[] | undefined;
      const ok = await apply(async () => {
        const result = await uc.duplicateObjects.execute({ editionId, pageNumber, ...masterPart, objectIds });
        ids = result.objectIds;
        return result.edition;
      });
      return ok ? ids : undefined;
    },
    updateObjects: (pageNumber: number, updates: readonly IdPatch[]) =>
      apply(() => uc.updateObjects.execute({ editionId, pageNumber, ...masterPart, updates })),
    updateObject: (pageNumber: number, id: string, patch: ObjectPatch) =>
      apply(() => uc.updateObjects.execute({ editionId, pageNumber, ...masterPart, updates: [{ id, patch }] })),
    removeObjects: (pageNumber: number, objectIds: readonly string[]) =>
      apply(() => uc.removeObjects.execute({ editionId, pageNumber, ...masterPart, objectIds })),
    reorderObjects: (pageNumber: number, objectIds: readonly string[], op: ArrangeOp) =>
      apply(() => uc.reorderObjects.execute({ editionId, pageNumber, ...masterPart, objectIds, op })),
    alignObjects: (
      pageNumber: number,
      objectIds: readonly string[],
      mode: AlignMode,
      to: AlignTarget,
    ) => apply(() => uc.alignObjects.execute({ editionId, pageNumber, ...masterPart, objectIds, mode, to })),
    distributeObjects: (
      pageNumber: number,
      objectIds: readonly string[],
      axis: DistributeAxis,
    ) => apply(() => uc.distributeObjects.execute({ editionId, pageNumber, ...masterPart, objectIds, axis })),
    groupObjects: (pageNumber: number, objectIds: readonly string[]) =>
      apply(() => uc.groupObjects.execute({ editionId, pageNumber, ...masterPart, objectIds })),
    ungroupObjects: (pageNumber: number, objectIds: readonly string[]) =>
      apply(() => uc.ungroupObjects.execute({ editionId, pageNumber, ...masterPart, objectIds })),
    setGuides: (pageNumber: number, guides: readonly Guide[]) =>
      apply(() => uc.setGuides.execute({ editionId, pageNumber, guides })),
    continueStory: (pageNumber: number, leafId: string, toPageNumber: number) =>
      apply(() => uc.continueStory.execute({ editionId, pageNumber, leafId, toPageNumber })),
    unlinkContinuation: (leafId: string) =>
      apply(() => uc.unlinkContinuation.execute({ editionId, leafId })),
    autoFitPage: (pageNumber: number) =>
      apply(() => uc.autoFitPage.execute({ editionId, pageNumber })),
    clearSlot: (pageNumber: number, leafId: string) =>
      apply(() => uc.clearSlot.execute({ editionId, pageNumber, leafId })),
    removeSlot: (pageNumber: number, leafId: string) =>
      apply(() => uc.removeSlot.execute({ editionId, pageNumber, leafId })),
    setSlotStyle: (
      pageNumber: number,
      leafId: string,
      style: Partial<LeafStyle> | null,
      role?: SlotRole,
    ) =>
      apply(() =>
        uc.setSlotStyle.execute({ editionId, pageNumber, leafId, style, ...(role && { role }) }),
      ),
    createMaster: async (name: string, fromPageNumber?: number): Promise<string | undefined> => {
      let id: string | undefined;
      const ok = await apply(async () => {
        const result = await uc.createMaster.execute({
          editionId,
          name,
          ...(fromPageNumber !== undefined && { fromPageNumber }),
        });
        id = result.masterId;
        return result.edition;
      });
      return ok ? id : undefined;
    },
    assignMaster: (pageNumber: number, assigned: string | undefined) =>
      apply(() =>
        uc.assignMaster.execute({ editionId, pageNumber, ...(assigned && { masterId: assigned }) }),
      ),
    renameMaster: (id: string, name: string) =>
      apply(() => uc.renameMaster.execute({ editionId, masterId: id, name })),
    deleteMaster: (id: string) => apply(() => uc.deleteMaster.execute({ editionId, masterId: id })),
    applyPageTemplate: (pageNumber: number, templateId: string) =>
      apply(() => uc.applyPageTemplate.execute({ editionId, pageNumber, templateId })),
    applyEditionTemplate: (templateId: string) =>
      apply(() => uc.applyEditionTemplate.execute({ editionId, templateId })),
    updateMasthead: (masthead: Partial<Masthead>) =>
      apply(() => uc.updateMasthead.execute({ editionId, masthead })),
    setSlotRole: (pageNumber: number, leafId: string, role: SlotRole) =>
      apply(() => uc.setSlotRole.execute({ editionId, pageNumber, leafId, role })),
    resizeSplit: (pageNumber: number, splitId: string, sizes: readonly number[]) =>
      apply(() => uc.resizeSplit.execute({ editionId, pageNumber, splitId, sizes })),
  };
}

/** Undo and redo for layout changes (page structure, styles, masthead, elements). */
export function useUndoRedo() {
  const editionId = useEditionId();
  const { restoreEdition } = useUseCases();
  const queryClient = useQueryClient();
  const canUndo = useHistoryStore((s) => (s.past[editionId]?.length ?? 0) > 0);
  const canRedo = useHistoryStore((s) => (s.future[editionId]?.length ?? 0) > 0);

  const step = useCallback(
    async (direction: 'undo' | 'redo') => {
      const current = queryClient.getQueryData<Edition>(editionKey(editionId));
      if (!current) return;
      const target = useHistoryStore.getState()[direction](editionId, current);
      if (!target) return;
      try {
        queryClient.setQueryData(editionKey(editionId), await restoreEdition.execute({ edition: target }));
      } catch (error) {
        toast.error(messageOf(error));
      }
    },
    [editionId, queryClient, restoreEdition],
  );

  return {
    canUndo,
    canRedo,
    undo: () => step('undo'),
    redo: () => step('redo'),
  };
}

export const libraryKey = ['library'] as const;

/** Saved templates, styles and the brand kit, newest first. */
export function useLibrary() {
  const { listLibrary } = useUseCases();
  return useQuery({ queryKey: libraryKey, queryFn: () => listLibrary.execute() });
}

/** Saving to and deleting from the library; each refreshes the list and toasts errors. */
export function useLibraryActions() {
  const editionId = useEditionId();
  const uc = useUseCases();
  const queryClient = useQueryClient();

  const run = async <T>(task: () => Promise<T>): Promise<T | undefined> => {
    try {
      const result = await task();
      await queryClient.invalidateQueries({ queryKey: libraryKey });
      return result;
    } catch (error) {
      toast.error(messageOf(error));
      return undefined;
    }
  };

  return {
    savePageTemplate: (pageNumber: number, name: string) =>
      run(() => uc.savePageTemplate.execute({ editionId, pageNumber, name })),
    saveEditionTemplate: (name: string) =>
      run(() => uc.saveEditionTemplate.execute({ editionId, name })),
    saveTileStyle: (name: string, role: SlotRole, style: Partial<LeafStyle>) =>
      run(() => uc.saveTileStyle.execute({ name, role, style })),
    saveBrandKit: (masthead: Partial<Masthead>) =>
      run(() => uc.saveBrandKit.execute({ masthead })),
    deleteItem: (id: string) => run(() => uc.deleteLibraryItem.execute({ id })),
  };
}

export const assetsKey = ['assets'] as const;

/** The photo library with where-used counts, newest first. */
export function useAssets() {
  const { listAssets } = useUseCases();
  return useQuery({ queryKey: assetsKey, queryFn: () => listAssets.execute() });
}

/** Uploading, describing and deleting photos; each refreshes the library and toasts errors. */
export function useAssetActions() {
  const uc = useUseCases();
  const queryClient = useQueryClient();

  const refresh = () => queryClient.invalidateQueries({ queryKey: assetsKey });

  return {
    /** Saves picture files to the library (downscaled when huge); resolves to what was saved. */
    upload: async (files: readonly File[]): Promise<Asset[]> => {
      const saved: Asset[] = [];
      for (const file of files) {
        if (!isImageFile(file)) continue;
        try {
          const prepared = await prepareImage(file);
          saved.push(await uc.saveAsset.execute({ ...prepared, name: file.name }));
        } catch (error) {
          toast.error(messageOf(error));
        }
      }
      await refresh();
      return saved;
    },
    updateMeta: async (id: string, meta: AssetMeta) => {
      try {
        await uc.updateAssetMeta.execute({ id, meta });
        await refresh();
      } catch (error) {
        toast.error(messageOf(error));
      }
    },
    remove: async (id: string): Promise<boolean> => {
      try {
        await uc.deleteAsset.execute({ id });
        await refresh();
        return true;
      } catch (error) {
        toast.error(messageOf(error));
        return false;
      }
    },
  };
}

/** Print-readiness problems of the current edition; refreshed whenever it is asked for again. */
export function usePreflight(enabled: boolean, bleedMm = 0) {
  const editionId = useEditionId();
  const { runPreflight } = useUseCases();
  return useQuery({
    queryKey: ['preflight', editionId, bleedMm],
    queryFn: async () => [...(await checkFonts()), ...(await runPreflight.execute({ editionId, bleedMm }))],
    enabled: enabled && editionId !== '',
    staleTime: 0,
    gcTime: 0,
  });
}

/** Backing up an edition to a file, restoring it, and rendering it with the Chromium companion. */
export function useEditionFiles() {
  const { exportEditionBundle, importEditionBundle } = useUseCases();
  const editionId = useEditionId();
  const queryClient = useQueryClient();
  const setEditionId = useEditionStore((s) => s.setEditionId);

  const bundle = async () => exportEditionBundle.execute({ editionId });

  /** Asks the dev-server companion to render the edition; resolves to the file, or undefined. */
  const render = async (
    options: { format: 'pdf' | 'png'; marks: boolean; page?: number },
    fallbackMessage: string,
  ): Promise<Blob | undefined> => {
    try {
      const { blob } = await bundle();
      const query = new URLSearchParams({
        format: options.format,
        marks: options.marks ? '1' : '0',
        page: String(options.page ?? 1),
      });
      const response = await fetch(`/__tazza/export?${query}`, { method: 'POST', body: blob });
      if (!response.ok) {
        const text = await response.text();
        toast.error(response.status === 404 ? fallbackMessage : text || fallbackMessage);
        return undefined;
      }
      return await response.blob();
    } catch (error) {
      toast.error(messageOf(error));
      return undefined;
    }
  };

  return {
    editionId,
    bundle,
    render,
    restore: async (file: File): Promise<boolean> => {
      try {
        const imported = await importEditionBundle.execute({ file });
        setEditionId(imported.editionId);
        await queryClient.invalidateQueries();
        return true;
      } catch (error) {
        toast.error(messageOf(error));
        return false;
      }
    },
  };
}

/** Review, comments and versions for stories, done as the current person. */
export function useWorkflowActions(beforeChange?: () => Promise<void>) {
  const uc = useUseCases();
  const editionId = useEditionId();
  const queryClient = useQueryClient();
  const actor = useActor();

  const run = async <T>(work: () => Promise<T>): Promise<T | undefined> => {
    try {
      await beforeChange?.();
      const result = await work();
      await queryClient.invalidateQueries({ queryKey: articlesKey(editionId) });
      return result;
    } catch (error) {
      toast.error(messageOf(error));
      return undefined;
    }
  };

  return {
    actor,
    changeStatus: (id: string, to: ArticleStatus, note?: string) =>
      run(() => uc.changeArticleStatus.execute({ id, to, actor, ...(note !== undefined && { note }) })),
    addNote: (id: string, text: string) => run(() => uc.addArticleNote.execute({ id, actor, text })),
    resolveNote: (id: string, noteId: string, resolved: boolean) =>
      run(() => uc.resolveArticleNote.execute({ id, noteId, resolved })),
    saveVersion: (id: string, label?: string) =>
      run(() => uc.saveArticleVersion.execute({ id, actor, ...(label && { label }) })),
    restoreVersion: (id: string, versionId: string) =>
      run(() => uc.restoreArticleVersion.execute({ id, versionId, actor })),
  };
}

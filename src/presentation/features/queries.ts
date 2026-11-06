import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Edition } from '@domain/entities/Edition';
import type { Element, ElementKind } from '@domain/layout/element';
import type { AlignMode, ArrangeOp, ObjectPatch, ObjectTool } from '@domain/layout/objects';
import type { TemplateId } from '@domain/layout/templates';
import type { LeafStyle, Masthead } from '@domain/layout/style';
import type { SlotRole } from '@domain/layout/tree';
import type { DropZone } from '@domain/usecases/layout/DropArticle';
import { useUseCases } from '../hooks/AppContext';
import { useEditionStore } from '../state/editionStore';
import { useHistoryStore } from '../state/historyStore';

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
export function useLayoutActions() {
  const editionId = useEditionId();
  const uc = useUseCases();
  const queryClient = useQueryClient();

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
        const result = await uc.addObject.execute({ editionId, pageNumber, tool });
        id = result.objectId;
        return result.edition;
      });
      return ok ? id : undefined;
    },
    duplicateObject: async (pageNumber: number, objectId: string): Promise<string | undefined> => {
      let id: string | undefined;
      const ok = await apply(async () => {
        const result = await uc.duplicateObject.execute({ editionId, pageNumber, objectId });
        id = result.objectId;
        return result.edition;
      });
      return ok ? id : undefined;
    },
    updateObject: (pageNumber: number, objectId: string, patch: ObjectPatch) =>
      apply(() => uc.updateObject.execute({ editionId, pageNumber, objectId, patch })),
    removeObject: (pageNumber: number, objectId: string) =>
      apply(() => uc.removeObject.execute({ editionId, pageNumber, objectId })),
    reorderObject: (pageNumber: number, objectId: string, op: ArrangeOp) =>
      apply(() => uc.reorderObject.execute({ editionId, pageNumber, objectId, op })),
    alignObject: (pageNumber: number, objectId: string, mode: AlignMode, to: 'page' | 'live') =>
      apply(() => uc.alignObject.execute({ editionId, pageNumber, objectId, mode, to })),
    autoFitPage: (pageNumber: number) =>
      apply(() => uc.autoFitPage.execute({ editionId, pageNumber })),
    clearSlot: (pageNumber: number, leafId: string) =>
      apply(() => uc.clearSlot.execute({ editionId, pageNumber, leafId })),
    removeSlot: (pageNumber: number, leafId: string) =>
      apply(() => uc.removeSlot.execute({ editionId, pageNumber, leafId })),
    setSlotStyle: (pageNumber: number, leafId: string, style: Partial<LeafStyle> | null) =>
      apply(() => uc.setSlotStyle.execute({ editionId, pageNumber, leafId, style })),
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

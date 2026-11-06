import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Edition } from '@domain/entities/Edition';
import type { TemplateId } from '@domain/layout/templates';
import type { SlotRole } from '@domain/layout/tree';
import type { DropZone } from '@domain/usecases/layout/DropArticle';
import { useUseCases } from '../hooks/AppContext';
import { useEditionStore } from '../state/editionStore';

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
  articleId: string;
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
        queryClient.setQueryData(editionKey(editionId), await run());
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
    autoFitPage: (pageNumber: number) =>
      apply(() => uc.autoFitPage.execute({ editionId, pageNumber })),
    clearSlot: (pageNumber: number, leafId: string) =>
      apply(() => uc.clearSlot.execute({ editionId, pageNumber, leafId })),
    removeSlot: (pageNumber: number, leafId: string) =>
      apply(() => uc.removeSlot.execute({ editionId, pageNumber, leafId })),
    setSlotRole: (pageNumber: number, leafId: string, role: SlotRole) =>
      apply(() => uc.setSlotRole.execute({ editionId, pageNumber, leafId, role })),
    resizeSplit: (pageNumber: number, splitId: string, sizes: readonly number[]) =>
      apply(() => uc.resizeSplit.execute({ editionId, pageNumber, splitId, sizes })),
  };
}

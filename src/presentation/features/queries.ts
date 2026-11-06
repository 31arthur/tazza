import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Edition } from '@domain/entities/Edition';
import type { GridPlacement } from '@domain/services/PageGeometry';
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
    addPage: () => apply(() => uc.addPage.execute({ editionId })),
    removePage: (pageNumber: number) =>
      apply(() => uc.removePage.execute({ editionId, pageNumber })),
    placeArticle: (pageNumber: number, articleId: string) =>
      apply(() => uc.placeArticle.execute({ editionId, pageNumber, articleId })),
    updateBlock: (pageNumber: number, blockId: string, placement: GridPlacement) =>
      apply(() => uc.updateBlock.execute({ editionId, pageNumber, blockId, placement })),
    removeBlock: (blockId: string) => apply(() => uc.removeBlock.execute({ editionId, blockId })),
  };
}

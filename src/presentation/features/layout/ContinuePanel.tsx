import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FlowSlice } from '@domain/layout/flow';
import type { Leaf } from '@domain/layout/tree';
import { Button } from '../../components/ui/button';

interface Props {
  leaf: Leaf;
  /** How this tile's story is divided, when it is part of a continued story. */
  slice: FlowSlice | undefined;
  pageNumbers: readonly number[];
  currentPage: number;
  onContinue: (toPageNumber: number) => void;
  /** Removes the continuation that follows the given tile. */
  onUnlink: (leafId: string) => void;
}

const selectClass = 'h-9 w-full rounded-md border bg-transparent px-2 text-sm text-foreground';

/** Overset help: carry the story on in another tile, on this page or a later one. */
export function ContinuePanel({ leaf, slice, pageNumbers, currentPage, onContinue, onUnlink }: Props) {
  const { t } = useTranslation();
  const later = pageNumbers.find((n) => n > currentPage);
  const [target, setTarget] = useState<number>(later ?? currentPage);
  const hasNext = slice?.continuedToPage !== undefined;
  const isContinuation = leaf.continuesFrom !== undefined && slice !== undefined && !slice.first;

  return (
    <div className="flex flex-col gap-2">

      {slice?.continuedFromPage !== undefined && (
        <p className="text-sm">{t('flow.fromInfo', { page: slice.continuedFromPage })}</p>
      )}
      {slice?.continuedToPage !== undefined && (
        <p className="text-sm">{t('flow.toInfo', { page: slice.continuedToPage })}</p>
      )}

      {!hasNext && (
        <>
          <p className="text-xs text-muted-foreground">{t('flow.hint')}</p>
          <select
            className={selectClass}
            aria-label={t('flow.toPage')}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
          >
            {pageNumbers.map((n) => (
              <option key={n} value={n}>
                {t('layout.page', { n })}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={() => onContinue(target)}>
            {t('flow.continue')}
          </Button>
        </>
      )}

      {hasNext && (
        <Button variant="outline" onClick={() => onUnlink(leaf.id)}>
          {t('flow.removeNext')}
        </Button>
      )}
      {isContinuation && !hasNext && leaf.continuesFrom !== undefined && (
        <Button variant="outline" onClick={() => onUnlink(leaf.continuesFrom ?? '')}>
          {t('flow.removeThis')}
        </Button>
      )}
    </div>
  );
}

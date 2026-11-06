import { ChevronDown, ChevronUp, Eye, EyeOff, Link2, Lock, Unlock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ArrangeOp, ObjectPatch, PageObject } from '@domain/layout/objects';
import { detectLanguage } from '@domain/services/detectLanguage';
import { cn } from '../../lib/utils';

interface Props {
  objects: readonly PageObject[];
  selectedIds: readonly string[];
  /** Shift-click adds to or removes from the selection. */
  onSelect: (id: string, additive: boolean) => void;
  onPatch: (id: string, patch: ObjectPatch) => void;
  onArrange: (id: string, op: ArrangeOp) => void;
}

const label = (o: PageObject): string =>
  o.kind === 'text' ? o.text.split('\n')[0]?.slice(0, 28) || o.name : o.name;

/** Objects on the page, top of the stack first: select, hide, lock and reorder. */
export function LayersPanel({ objects, selectedIds, onSelect, onPatch, onArrange }: Props) {
  const { t } = useTranslation();
  const topFirst = [...objects].reverse();

  return (
    <div className="border-b p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('objects.layers')} ({objects.length})
      </h2>
      {objects.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('objects.noLayers')}</p>
      ) : (
        <ul className="max-h-40 overflow-y-auto">
          {topFirst.map((o) => (
            <li
              key={o.id}
              className={cn(
                'flex items-center gap-1 rounded px-1 py-0.5 text-sm',
                selectedIds.includes(o.id) ? 'bg-accent' : 'hover:bg-muted',
              )}
            >
              <button
                type="button"
                onClick={(e) => onSelect(o.id, e.shiftKey)}
                lang={detectLanguage(label(o))}
                className={cn('min-w-0 flex-1 truncate text-left', o.hidden && 'text-muted-foreground line-through')}
              >
                {label(o)}
              </button>
              {o.groupId !== undefined && (
                <span title={t('objects.group')} aria-label={t('objects.group')}>
                  <Link2 className="size-3.5 text-muted-foreground" />
                </span>
              )}
              <button
                type="button"
                aria-label={t('objects.moveUp')}
                title={t('objects.moveUp')}
                onClick={() => onArrange(o.id, 'forward')}
              >
                <ChevronUp className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={t('objects.moveDown')}
                title={t('objects.moveDown')}
                onClick={() => onArrange(o.id, 'backward')}
              >
                <ChevronDown className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={o.hidden ? t('objects.show') : t('objects.hide')}
                title={o.hidden ? t('objects.show') : t('objects.hide')}
                onClick={() => onPatch(o.id, { hidden: !o.hidden })}
              >
                {o.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
              <button
                type="button"
                aria-label={o.locked ? t('objects.unlock') : t('objects.lock')}
                title={o.locked ? t('objects.unlock') : t('objects.lock')}
                onClick={() => onPatch(o.id, { locked: !o.locked })}
              >
                {o.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

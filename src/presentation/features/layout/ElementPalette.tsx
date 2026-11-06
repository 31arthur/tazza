import type { ComponentType } from 'react';
import { Image, Megaphone, StickyNote, Tag, Type } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ELEMENT_KINDS, type ElementKind } from '@domain/layout/element';
import type { DragSource } from './useLayoutDnd';

const ICONS: Record<ElementKind, ComponentType<{ className?: string }>> = {
  photo: Image,
  text: Type,
  sidebar: StickyNote,
  label: Tag,
  ad: Megaphone,
};

interface Props {
  onAdd: (kind: ElementKind) => void;
  onStartDrag: (event: React.PointerEvent, source: DragSource) => void;
}

/** Page furniture that is not a story: click to add along the bottom, or drag onto the page. */
export function ElementPalette({ onAdd, onStartDrag }: Props) {
  const { t } = useTranslation();
  return (
    <div className="border-b p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('elements.title')}
      </h2>
      <div className="grid grid-cols-5 gap-1">
        {ELEMENT_KINDS.map((kind) => {
          const Icon = ICONS[kind];
          return (
            <button
              key={kind}
              type="button"
              title={t(`elements.kinds.${kind}`)}
              aria-label={t(`elements.kinds.${kind}`)}
              onPointerDown={(e) =>
                onStartDrag(e, { elementKind: kind, label: t(`elements.kinds.${kind}`) })
              }
              onClick={() => onAdd(kind)}
              className="flex touch-none select-none flex-col items-center gap-1 rounded-md border bg-background p-2 text-[10px] hover:bg-accent"
            >
              <Icon className="size-4" />
              <span className="truncate">{t(`elements.kinds.${kind}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

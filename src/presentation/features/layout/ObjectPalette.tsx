import type { ComponentType } from 'react';
import { Circle, Image, Minus, Square, Type } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OBJECT_TOOLS, type ObjectTool } from '@domain/layout/objects';

const ICONS: Record<ObjectTool, ComponentType<{ className?: string }>> = {
  text: Type,
  rect: Square,
  ellipse: Circle,
  line: Minus,
  image: Image,
};

/** Insert free objects: stamps, shapes, lines and image frames that sit anywhere on the page. */
export function ObjectPalette({ onAdd }: { onAdd: (tool: ObjectTool) => void }) {
  const { t } = useTranslation();
  return (
    <div className="border-b p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('objects.insert')}
      </h2>
      <div className="grid grid-cols-5 gap-1">
        {OBJECT_TOOLS.map((tool) => {
          const Icon = ICONS[tool];
          return (
            <button
              key={tool}
              type="button"
              title={t(`objects.tools.${tool}`)}
              aria-label={t(`objects.tools.${tool}`)}
              onClick={() => onAdd(tool)}
              className="flex flex-col items-center gap-1 rounded-md border bg-background p-2 text-[10px] hover:bg-accent"
            >
              <Icon className="size-4" />
              <span className="truncate">{t(`objects.tools.${tool}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

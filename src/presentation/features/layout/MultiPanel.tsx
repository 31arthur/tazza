import { useState } from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  BringToFront,
  ChevronDown,
  ChevronUp,
  Copy,
  Group,
  SendToBack,
  Trash2,
  Ungroup,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ALIGN_MODES, type AlignMode, type ArrangeOp, type PageObject } from '@domain/layout/objects';
import { ALIGN_TO, boundsOf, type AlignTarget, type DistributeAxis } from '@domain/layout/selection';
import { Button } from '../../components/ui/button';

interface Props {
  objects: readonly PageObject[];
  onAlign: (mode: AlignMode, to: AlignTarget) => void;
  onDistribute: (axis: DistributeAxis) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onArrange: (op: ArrangeOp) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

const ALIGN_ICONS = {
  left: AlignStartVertical,
  centerH: AlignCenterVertical,
  right: AlignEndVertical,
  top: AlignStartHorizontal,
  middleV: AlignCenterHorizontal,
  bottom: AlignEndHorizontal,
} as const;

const selectClass = 'h-9 w-full rounded-md border bg-transparent px-2 text-sm text-foreground';

/** Inspector for several selected objects (or a group): align, distribute, group, arrange. */
export function MultiPanel({
  objects,
  onAlign,
  onDistribute,
  onGroup,
  onUngroup,
  onArrange,
  onDuplicate,
  onRemove,
}: Props) {
  const { t } = useTranslation();
  const [to, setTo] = useState<AlignTarget>('selection');
  const bounds = boundsOf(objects);
  const groupIds = new Set(objects.map((o) => o.groupId));
  const oneWholeGroup = groupIds.size === 1 && !groupIds.has(undefined);
  const anyGrouped = objects.some((o) => o.groupId !== undefined);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="font-semibold">
          {oneWholeGroup ? t('objects.group') : t('objects.selected', { count: objects.length })}
        </div>
        {bounds && (
          <div className="text-xs text-muted-foreground">
            {Math.round(bounds.w)} × {Math.round(bounds.h)} mm
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!oneWholeGroup && (
          <Button variant="outline" className="flex-1" onClick={onGroup}>
            <Group /> {t('objects.groupAction')}
          </Button>
        )}
        {anyGrouped && (
          <Button variant="outline" className="flex-1" onClick={onUngroup}>
            <Ungroup /> {t('objects.ungroup')}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('objects.align')}
        </h3>
        <select
          className={selectClass}
          value={to}
          aria-label={t('objects.alignTo')}
          onChange={(e) => setTo(e.target.value as AlignTarget)}
        >
          {ALIGN_TO.map((target) => (
            <option key={target} value={target}>
              {t(`objects.alignTargets.${target}`)}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          {ALIGN_MODES.map((mode) => {
            const Icon = ALIGN_ICONS[mode];
            return (
              <Button
                key={mode}
                size="icon"
                variant="outline"
                aria-label={t(`objects.alignModes.${mode}`)}
                title={t(`objects.alignModes.${mode}`)}
                onClick={() => onAlign(mode, to)}
              >
                <Icon />
              </Button>
            );
          })}
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="outline"
            disabled={objects.length < 3}
            aria-label={t('objects.distributeH')}
            title={t('objects.distributeH')}
            onClick={() => onDistribute('horizontal')}
          >
            <AlignHorizontalDistributeCenter />
          </Button>
          <Button
            size="icon"
            variant="outline"
            disabled={objects.length < 3}
            aria-label={t('objects.distributeV')}
            title={t('objects.distributeV')}
            onClick={() => onDistribute('vertical')}
          >
            <AlignVerticalDistributeCenter />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('objects.arrange')}
        </h3>
        <div className="flex gap-1">
          {([
            ['front', BringToFront],
            ['forward', ChevronUp],
            ['backward', ChevronDown],
            ['back', SendToBack],
          ] as const).map(([op, Icon]) => (
            <Button
              key={op}
              size="icon"
              variant="outline"
              aria-label={t(`objects.arrangeOps.${op}`)}
              title={t(`objects.arrangeOps.${op}`)}
              onClick={() => onArrange(op)}
            >
              <Icon />
            </Button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 border-t pt-3">
        <Button variant="outline" className="flex-1" onClick={onDuplicate}>
          <Copy /> {t('objects.duplicate')}
        </Button>
        <Button variant="outline" className="flex-1" onClick={onRemove}>
          <Trash2 /> {t('objects.delete')}
        </Button>
      </div>
    </div>
  );
}

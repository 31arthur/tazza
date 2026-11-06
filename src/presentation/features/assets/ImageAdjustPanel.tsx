import { useRef, type PointerEvent } from 'react';
import { AlertTriangle, RotateCcw, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  MIN_PRINT_PPI,
  effectivePpi,
  isDefaultAdjust,
  resolveAdjust,
  type ImageAdjust,
} from '@domain/entities/ImageAdjust';
import { Button } from '../../components/ui/button';
import { useAssetUrl } from '../../hooks/useAssetUrl';
import { useAssets } from '../queries';

interface Props {
  assetId: string;
  adjust: Partial<ImageAdjust> | undefined;
  /** Size of the frame the photo fills, in millimetres, for the print-resolution check. */
  frameMm?: { w: number; h: number } | undefined;
  onChange: (adjust: Partial<ImageAdjust> | undefined) => void;
}

const quarter = (rotation: ImageAdjust['rotation'], by: 90 | -90): ImageAdjust['rotation'] =>
  resolveAdjust({ rotation: (rotation + by + 360) as ImageAdjust['rotation'] }).rotation;

/** Crop (focal point and zoom), rotate and tone for one use of a photo; the original is untouched. */
export function ImageAdjustPanel({ assetId, adjust, frameMm, onChange }: Props) {
  const { t } = useTranslation();
  const url = useAssetUrl(assetId);
  const { data: items = [] } = useAssets();
  const asset = items.find((i) => i.asset.id === assetId)?.asset;
  const box = useRef<HTMLDivElement>(null);
  const a = resolveAdjust(adjust);

  const set = (patch: Partial<ImageAdjust>) => onChange({ ...adjust, ...patch });

  const aim = (e: PointerEvent) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    set({
      focalX: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      focalY: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    });
  };

  const ppi = asset && frameMm ? Math.round(effectivePpi(asset, frameMm, adjust)) : undefined;
  const slider = (label: string, key: 'zoom' | 'brightness' | 'contrast', min: number, max: number) => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={a[key]}
        onChange={(e) => set({ [key]: Number(e.target.value) })}
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">{t('adjust.focalHint')}</p>
      <div
        ref={box}
        className="relative cursor-crosshair touch-none select-none overflow-hidden rounded border bg-muted"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          aim(e);
        }}
        onPointerMove={(e) => e.buttons === 1 && aim(e)}
      >
        {url && <img src={url} alt="" draggable={false} className="block w-full" />}
        <span
          aria-hidden
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-500 shadow"
          style={{ left: `${a.focalX * 100}%`, top: `${a.focalY * 100}%` }}
        />
      </div>

      {slider(t('adjust.zoom'), 'zoom', 1, 3)}

      <div className="flex gap-1">
        <Button
          size="icon"
          variant="outline"
          aria-label={t('adjust.rotateLeft')}
          title={t('adjust.rotateLeft')}
          onClick={() => set({ rotation: quarter(a.rotation, -90) })}
        >
          <RotateCcw />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label={t('adjust.rotateRight')}
          title={t('adjust.rotateRight')}
          onClick={() => set({ rotation: quarter(a.rotation, 90) })}
        >
          <RotateCw />
        </Button>
        <Button
          variant={a.greyscale ? 'secondary' : 'outline'}
          aria-pressed={a.greyscale}
          className="flex-1"
          onClick={() => set({ greyscale: !a.greyscale })}
        >
          {t('adjust.greyscale')}
        </Button>
      </div>

      {slider(t('adjust.brightness'), 'brightness', 0.4, 1.8)}
      {slider(t('adjust.contrast'), 'contrast', 0.4, 1.8)}

      {ppi !== undefined && (
        <p
          className={`flex items-center gap-1 text-xs ${
            ppi < MIN_PRINT_PPI ? 'text-amber-600' : 'text-muted-foreground'
          }`}
        >
          {ppi < MIN_PRINT_PPI && <AlertTriangle className="size-3.5" />}
          {t('adjust.ppi', { ppi })}
          {ppi < MIN_PRINT_PPI && ` — ${t('adjust.lowRes')}`}
        </p>
      )}

      <Button
        variant="outline"
        disabled={isDefaultAdjust(adjust)}
        onClick={() => onChange(undefined)}
      >
        {t('adjust.reset')}
      </Button>
    </div>
  );
}

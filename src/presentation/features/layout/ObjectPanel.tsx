import { useRef, useState, type ReactNode } from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  Bold,
  BringToFront,
  ChevronDown,
  ChevronUp,
  Copy,
  ImagePlus,
  Italic,
  Library,
  SendToBack,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  ALIGN_MODES,
  type AlignMode,
  type ArrangeOp,
  type ObjectPatch,
  type PageObject,
} from '@domain/layout/objects';
import { PAINTS, paintColor, type HeadlineFont, type Paint } from '@domain/layout/style';
import { detectLanguage } from '@domain/services/detectLanguage';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { isImageFile } from '../../lib/image';
import { cn } from '../../lib/utils';
import { AssetPicker } from '../assets/AssetPicker';
import { ImageAdjustPanel } from '../assets/ImageAdjustPanel';
import { useAssetActions } from '../queries';

interface Props {
  object: PageObject;
  onPatch: (patch: ObjectPatch) => void;
  onAlign: (mode: AlignMode, to: 'page' | 'live') => void;
  onArrange: (op: ArrangeOp) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

const selectClass = 'h-9 w-full rounded-md border bg-transparent px-2 text-sm text-foreground';
const round = (n: number) => Math.round(n * 100) / 100;

const ALIGN_ICONS = {
  left: AlignStartVertical,
  centerH: AlignCenterVertical,
  right: AlignEndVertical,
  top: AlignStartHorizontal,
  middleV: AlignCenterHorizontal,
  bottom: AlignEndHorizontal,
} as const;

function Num({
  label,
  value,
  step = 1,
  onCommit,
}: {
  label: string;
  value: number;
  step?: number;
  onCommit: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <Input
        key={round(value)}
        type="number"
        step={step}
        defaultValue={round(value)}
        onBlur={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next) && round(next) !== round(value)) onCommit(next);
        }}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </label>
  );
}

function PaintPicker({
  label,
  value,
  onChange,
  t,
}: {
  label: string;
  value: Paint;
  onChange: (paint: Paint) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <div className="flex flex-wrap gap-1.5">
        {PAINTS.map((paint) => {
          const colour = paintColor(paint);
          return (
            <button
              key={paint}
              type="button"
              aria-label={t(`objects.paints.${paint}`)}
              title={t(`objects.paints.${paint}`)}
              aria-pressed={value === paint}
              onClick={() => onChange(paint)}
              className={cn(
                'size-5 rounded-full border',
                value === paint && 'ring-2 ring-blue-500 ring-offset-1',
                colour === undefined && 'bg-[linear-gradient(135deg,#fff_45%,#d33_45%,#d33_55%,#fff_55%)]',
              )}
              style={colour ? { background: colour } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

/** Contextual inspector for one free object: geometry, alignment, arrangement and appearance. */
export function ObjectPanel({ object: o, onPatch, onAlign, onArrange, onDuplicate, onRemove }: Props) {
  const { t } = useTranslation();
  const { upload } = useAssetActions();
  const [picking, setPicking] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const alignTo = useRef<'page' | 'live'>('live');

  const pickPhoto = async (file: File) => {
    const [asset] = await upload([file]);
    if (asset) onPatch({ assetId: asset.id });
  };

  const toggle = (active: boolean, label: string, icon: ReactNode, onClick: () => void) => (
    <Button
      size="icon"
      variant={active ? 'secondary' : 'outline'}
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {icon}
    </Button>
  );

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t('objects.name')}
        <Input
          key={o.id}
          defaultValue={o.name}
          onBlur={(e) => e.target.value !== o.name && onPatch({ name: e.target.value })}
        />
      </label>

      <Section title={t('objects.geometry')}>
        <div className="grid grid-cols-2 gap-2">
          <Num label="X (mm)" value={o.x} onCommit={(x) => onPatch({ x })} />
          <Num label="Y (mm)" value={o.y} onCommit={(y) => onPatch({ y })} />
          <Num label={`${t('objects.width')} (mm)`} value={o.w} onCommit={(w) => onPatch({ w })} />
          <Num label={`${t('objects.height')} (mm)`} value={o.h} onCommit={(h) => onPatch({ h })} />
          <Num label={`${t('objects.rotation')} (°)`} value={o.rotation} onCommit={(rotation) => onPatch({ rotation })} />
        </div>
      </Section>

      <Section title={t('objects.align')}>
        <select
          className={selectClass}
          defaultValue="live"
          aria-label={t('objects.alignTo')}
          onChange={(e) => (alignTo.current = e.target.value as 'page' | 'live')}
        >
          <option value="live">{t('objects.toMargins')}</option>
          <option value="page">{t('objects.toPage')}</option>
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
                onClick={() => onAlign(mode, alignTo.current)}
              >
                <Icon />
              </Button>
            );
          })}
        </div>
      </Section>

      <Section title={t('objects.arrange')}>
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
      </Section>

      {o.kind === 'text' && (
        <Section title={t('objects.tools.text')}>
          <Textarea
            key={o.id}
            rows={3}
            defaultValue={o.text}
            lang={detectLanguage(o.text)}
            onBlur={(e) => e.target.value !== o.text && onPatch({ text: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Num label={`${t('objects.fontSize')} (pt)`} value={o.fontSize} onCommit={(fontSize) => onPatch({ fontSize })} />
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('style.font')}
              <select
                className={selectClass}
                value={o.font}
                onChange={(e) => onPatch({ font: e.target.value as HeadlineFont })}
              >
                {(['serif', 'sans', 'display'] as const).map((f) => (
                  <option key={f} value={f}>
                    {t(`style.fonts.${f}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex gap-1">
            {toggle(o.bold, t('objects.bold'), <Bold />, () => onPatch({ bold: !o.bold }))}
            {toggle(o.italic, t('objects.italic'), <Italic />, () => onPatch({ italic: !o.italic }))}
            {toggle(o.align === 'left', t('objects.alignLeft'), <AlignLeft />, () => onPatch({ align: 'left' }))}
            {toggle(o.align === 'center', t('objects.alignCentre'), <AlignCenter />, () => onPatch({ align: 'center' }))}
            {toggle(o.align === 'right', t('objects.alignRight'), <AlignRight />, () => onPatch({ align: 'right' }))}
          </div>
          <PaintPicker label={t('objects.textColour')} value={o.color} onChange={(color) => onPatch({ color })} t={t} />
          <PaintPicker label={t('objects.background')} value={o.background} onChange={(background) => onPatch({ background })} t={t} />
        </Section>
      )}

      {o.kind === 'shape' && (
        <Section title={t('objects.appearance')}>
          {o.shape !== 'line' && (
            <PaintPicker label={t('objects.fill')} value={o.fill} onChange={(fill) => onPatch({ fill })} t={t} />
          )}
          <PaintPicker label={t('objects.stroke')} value={o.stroke} onChange={(stroke) => onPatch({ stroke })} t={t} />
          <div className="grid grid-cols-2 gap-2">
            <Num label={`${t('objects.strokeWidth')} (mm)`} value={o.strokeWidth} step={0.1} onCommit={(strokeWidth) => onPatch({ strokeWidth })} />
            {o.shape === 'rect' && (
              <Num label={`${t('objects.radius')} (mm)`} value={o.radius} onCommit={(radius) => onPatch({ radius })} />
            )}
          </div>
        </Section>
      )}

      {o.kind === 'image' && (
        <Section title={t('objects.tools.image')}>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => fileInput.current?.click()}>
              <ImagePlus /> {t('elements.choosePhoto')}
            </Button>
            <Button variant="outline" onClick={() => setPicking(true)}>
              <Library /> {t('photos.fromLibrary')}
            </Button>
          </div>
          {picking && (
            <AssetPicker onClose={() => setPicking(false)} onPick={(asset) => onPatch({ assetId: asset.id })} />
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            aria-hidden
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file && isImageFile(file)) void pickPhoto(file);
            }}
          />
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t('objects.fit')}
            <select
              className={selectClass}
              value={o.fit}
              onChange={(e) => onPatch({ fit: e.target.value as 'cover' | 'contain' })}
            >
              <option value="cover">{t('objects.fitCover')}</option>
              <option value="contain">{t('objects.fitContain')}</option>
            </select>
          </label>
          {o.assetId && (
            <ImageAdjustPanel
              key={`${o.id}-${o.assetId}`}
              assetId={o.assetId}
              adjust={o.adjust}
              frameMm={{ w: o.w, h: o.h }}
              onChange={(adjust) => onPatch({ adjust: adjust ?? {} })}
            />
          )}
        </Section>
      )}

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

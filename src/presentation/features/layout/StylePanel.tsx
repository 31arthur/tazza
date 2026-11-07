import { useTranslation } from 'react-i18next';
import {
  ACCENT_NAMES,
  PALETTE,
  TINTS,
  TINT_NAMES,
  resolveStyle,
  type FrameName,
  type HeadlineFont,
  type LeafStyle,
} from '@domain/layout/style';
import type { Leaf, SlotRole } from '@domain/layout/tree';
import { useLibrary, useLibraryActions } from '../queries';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

interface Props {
  leaf: Leaf;
  onChange: (style: Partial<LeafStyle> | null) => void;
  /** Applies a saved style: its role and its overrides, in one step. */
  onApplySaved: (role: SlotRole, style: Partial<LeafStyle>) => void;
}

const FRAMES: FrameName[] = ['rule', 'box', 'none'];
const FONTS: HeadlineFont[] = ['serif', 'sans', 'display'];
const selectClass = 'h-9 w-full rounded-md border bg-transparent px-2 text-sm text-foreground';

function Swatch({
  color,
  label,
  active,
  onClick,
}: {
  color: string | undefined;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        'size-6 rounded-full border',
        active && 'ring-2 ring-blue-500 ring-offset-1',
        color === undefined && 'bg-[linear-gradient(135deg,#fff_45%,#d33_45%,#d33_55%,#fff_55%)]',
      )}
      style={color ? { background: color } : undefined}
    />
  );
}

/** The two things people change most: the ink and the tint behind a story. */
export function StyleQuick({ leaf, onChange }: Pick<Props, "leaf" | "onChange">) {
  const { t } = useTranslation();
  const look = resolveStyle(leaf);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t("style.accent")}
        <div className="flex gap-2">
          {ACCENT_NAMES.map((name) => (
            <Swatch key={name} color={PALETTE[name]} label={t(`style.colors.${name}`)} active={look.accent === name} onClick={() => onChange({ accent: name })} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t("style.tint")}
        <div className="flex gap-2">
          {TINT_NAMES.map((name) => (
            <Swatch key={name} color={name === "none" ? undefined : TINTS[name]} label={t(`style.tints.${name}`)} active={look.tint === name} onClick={() => onChange({ tint: name })} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Everything else about how a tile looks: headline, frame, kicker, jump line. */
export function StyleMore({ leaf, onChange }: Pick<Props, "leaf" | "onChange">) {
  const { t } = useTranslation();
  const look = resolveStyle(leaf);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t('style.headlineColor')}
        <div className="flex gap-2">
          {(['ink', 'accent'] as const).map((choice) => (
            <Button
              key={choice}
              size="sm"
              variant={look.headlineColor === choice ? 'secondary' : 'outline'}
              onClick={() => onChange({ headlineColor: choice })}
            >
              {t(`style.headline.${choice}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t('style.tint')}
        <div className="flex gap-2">
          {TINT_NAMES.map((name) => (
            <Swatch
              key={name}
              color={name === 'none' ? undefined : TINTS[name]}
              label={t(`style.tints.${name}`)}
              active={look.tint === name}
              onClick={() => onChange({ tint: name })}
            />
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t('style.frame')}
        <select
          className={selectClass}
          value={look.frame}
          onChange={(e) => onChange({ frame: e.target.value as FrameName })}
        >
          {FRAMES.map((f) => (
            <option key={f} value={f}>
              {t(`style.frames.${f}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t('style.font')}
        <select
          className={selectClass}
          value={look.headlineFont}
          onChange={(e) => onChange({ headlineFont: e.target.value as HeadlineFont })}
        >
          {FONTS.map((f) => (
            <option key={f} value={f}>
              {t(`style.fonts.${f}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t('style.kicker')}
        <Input
          key={`k-${leaf.id}`}
          defaultValue={look.kicker}
          onBlur={(e) => e.target.value !== look.kicker && onChange({ kicker: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t('style.jump')}
        <Input
          key={`j-${leaf.id}`}
          defaultValue={look.jump}
          placeholder="2 >>"
          onBlur={(e) => e.target.value !== look.jump && onChange({ jump: e.target.value })}
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={look.headlineOverPhoto}
          onChange={(e) => onChange({ headlineOverPhoto: e.target.checked })}
        />
        {t('style.overPhoto')}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={look.deckBand}
          onChange={(e) => onChange({ deckBand: e.target.checked })}
        />
        {t('style.deckBand')}
      </label>

      <Button variant="outline" size="sm" onClick={() => onChange(null)}>
        {t('style.reset')}
      </Button>
    </div>
  );
}

/** Saved styles: apply one to this tile, or save this tile's look for next time. */
export function StyleSaved({ leaf, onApplySaved }: Pick<Props, "leaf" | "onApplySaved">) {
  const { t } = useTranslation();
  const { data: library = [] } = useLibrary();
  const { saveTileStyle } = useLibraryActions();
  const saved = library.filter((item) => item.kind === "tileStyle");
  return (
    <div className="flex flex-col gap-2">
        {saved.length > 0 && (
          <select
            className={selectClass}
            aria-label={t('style.applySaved')}
            value=""
            onChange={(e) => {
              const item = saved.find((s) => s.id === e.target.value);
              if (item?.kind === 'tileStyle') onApplySaved(item.role, item.style);
            }}
          >
            <option value="">{t('style.applySaved')}</option>
            {saved.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const name = window.prompt(t('style.saveName'));
            if (name !== null) void saveTileStyle(name, leaf.role, leaf.style ?? {});
          }}
        >
          {t('style.saveAs')}
        </Button>
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { ACCENT_NAMES, PALETTE, type AccentName, type Masthead } from '@domain/layout/style';
import { detectLanguage } from '@domain/services/detectLanguage';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../lib/utils';

interface Props {
  settings: Masthead;
  onChange: (patch: Partial<Masthead>) => void;
}

/** Edits the masthead of the edition: logo, colour, ears, top strip and print marks. */
export function MastheadPanel({ settings, onChange }: Props) {
  const { t } = useTranslation();

  const text = (key: 'title' | 'titleEn' | 'tagline' | 'topStrip', label: string) => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <Input
        defaultValue={settings[key]}
        lang={detectLanguage(settings[key])}
        onBlur={(e) => e.target.value !== settings[key] && onChange({ [key]: e.target.value })}
      />
    </label>
  );

  const ear = (key: 'leftEar' | 'rightEar', label: string) => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <Textarea
        rows={3}
        defaultValue={settings[key]}
        lang={detectLanguage(settings[key])}
        placeholder={t('masthead.earHint')}
        onBlur={(e) => e.target.value !== settings[key] && onChange({ [key]: e.target.value })}
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">{t('masthead.title')}</h2>
      {text('title', t('masthead.name'))}
      {text('titleEn', t('masthead.nameEn'))}
      {text('tagline', t('masthead.tagline'))}
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t('masthead.color')}
        <div className="flex gap-2">
          {ACCENT_NAMES.map((name: AccentName) => (
            <button
              key={name}
              type="button"
              aria-label={t(`style.colors.${name}`)}
              aria-pressed={settings.color === name}
              onClick={() => onChange({ color: name })}
              className={cn(
                'size-6 rounded-full border',
                settings.color === name && 'ring-2 ring-blue-500 ring-offset-1',
              )}
              style={{ background: PALETTE[name] }}
            />
          ))}
        </div>
      </div>
      {ear('leftEar', t('masthead.leftEar'))}
      {ear('rightEar', t('masthead.rightEar'))}
      {text('topStrip', t('masthead.topStrip'))}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.printMarks}
          onChange={(e) => onChange({ printMarks: e.target.checked })}
        />
        {t('masthead.printMarks')}
      </label>
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

const OPTIONS = ['en', 'te'] as const;

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  return (
    <div role="group" aria-label={t('language.switch')} className="inline-flex rounded-md border">
      {OPTIONS.map((lng) => (
        <button
          key={lng}
          type="button"
          aria-pressed={i18n.language === lng}
          onClick={() => void i18n.changeLanguage(lng)}
          className={cn(
            'px-3 py-1 text-sm',
            i18n.language === lng ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100',
          )}
        >
          {t(`language.${lng}`)}
        </button>
      ))}
    </div>
  );
}

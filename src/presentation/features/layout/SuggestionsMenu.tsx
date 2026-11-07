import { Check, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Suggestion } from '@domain/services/designAdvisor';
import { Popover } from '../../components/Popover';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

const KIND_TONE: Record<Suggestion['kind'], string> = {
  colour: 'bg-rose-100 text-rose-800',
  spacing: 'bg-sky-100 text-sky-800',
  balance: 'bg-amber-100 text-amber-800',
  content: 'bg-violet-100 text-violet-800',
};

/**
 * Plain-rule design advice for the page: colour by section, spacing, balance. Each suggestion
 * can be applied with one click (and undone with Undo); none is ever applied on its own.
 */
export function SuggestionsMenu({
  suggestions,
  onApply,
}: {
  suggestions: readonly Suggestion[];
  onApply: (suggestion: Suggestion) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const applicable = suggestions.filter((s) => s.action);

  return (
    <Popover
      label={
        <>
          <Sparkles className="text-amber-600" /> {t('advisor.title')}
        </>
      }
      badge={
        suggestions.length > 0 ? (
          <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-800">{suggestions.length}</span>
        ) : undefined
      }
      widthClass="w-96"
    >
      {suggestions.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="size-4 text-emerald-600" /> {t('advisor.allGood')}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {suggestions.map((s) => (
              <li key={s.id} className="rounded-lg border p-3">
                <div className="flex items-start gap-2">
                  <span className={cn('mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium', KIND_TONE[s.kind])}>
                    {t(`advisor.kinds.${s.kind}`)}
                  </span>
                  <p className="flex-1 text-sm">{t(`advisor.messages.${s.message}`, { ...s.params })}</p>
                </div>
                {s.action && (
                  <Button size="sm" variant="secondary" className="mt-2" onClick={() => onApply(s)}>
                    {t(`advisor.actions.${s.action.type}`)}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {applicable.length > 1 && (
            <Button
              size="sm"
              onClick={async () => {
                for (const s of applicable) await onApply(s);
              }}
            >
              <Sparkles /> {t('advisor.applyAll')}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">{t('advisor.note')}</p>
        </div>
      )}
    </Popover>
  );
}

import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { countBySeverity, type PreflightIssue } from '@domain/services/preflight';
import { cn } from '../../lib/utils';

const ICONS = { error: AlertCircle, warning: AlertTriangle, info: Info } as const;
const TONES = {
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-muted-foreground',
} as const;

/** The list of print-readiness problems; each row jumps to its page. */
export function PreflightPanel({
  issues,
  onGoToPage,
}: {
  issues: readonly PreflightIssue[];
  onGoToPage: (page: number) => void;
}) {
  const { t } = useTranslation();
  const counts = countBySeverity(issues);

  if (issues.length === 0) {
    return (
      <p className="flex items-center gap-2 p-3 text-sm text-green-700">
        <CheckCircle2 className="size-4" /> {t('preflight.allClear')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="text-sm font-medium">
        {t('preflight.summary', { errors: counts.error, warnings: counts.warning, notes: counts.info })}
      </p>
      <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {issues.map((issue, i) => {
          const Icon = ICONS[issue.severity];
          return (
            <li key={`${issue.page}-${issue.targetId ?? ''}-${issue.code}-${i}`}>
              <button
                type="button"
                onClick={() => onGoToPage(issue.page)}
                className="flex w-full items-start gap-2 rounded px-2 py-1 text-left text-sm hover:bg-accent"
              >
                <Icon className={cn('mt-0.5 size-4 shrink-0', TONES[issue.severity])} />
                <span>
                  {issue.page > 0 && <span className="font-medium">{t('layout.page', { n: issue.page })}: </span>}
                  {t(`preflight.codes.${issue.code}`, {
                    ...issue.params,
                    ...(issue.code === 'notApproved' && { status: t(`workflow.status.${String(issue.params?.['status'])}`) }),
                  })}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

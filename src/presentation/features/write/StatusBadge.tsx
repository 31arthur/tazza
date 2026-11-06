import { useTranslation } from 'react-i18next';
import type { ArticleStatus } from '@domain/entities/Workflow';
import { cn } from '../../lib/utils';

const TONES: Record<ArticleStatus, string> = {
  draft: 'bg-neutral-200 text-neutral-700',
  review: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
};

/** A small coloured label for where a story is in review. */
export function StatusBadge({ status, className }: { status: ArticleStatus; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium',
        TONES[status],
        className,
      )}
    >
      {t(`workflow.status.${status}`)}
    </span>
  );
}

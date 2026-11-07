import { LayoutTemplate, PenLine, SearchCheck, type LucideIcon } from 'lucide-react';
import type { Role } from '@domain/entities/Workflow';
import { cn } from '../../lib/utils';

/** Each role's icon and colour, used wherever a role is shown. */
export const ROLE_INFO: Readonly<Record<Role, { icon: LucideIcon; tone: string }>> = {
  reporter: { icon: PenLine, tone: 'bg-sky-100 text-sky-800' },
  editor: { icon: SearchCheck, tone: 'bg-amber-100 text-amber-800' },
  designer: { icon: LayoutTemplate, tone: 'bg-rose-100 text-rose-800' },
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const { icon: Icon, tone } = ROLE_INFO[role];
  return (
    <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', tone, className)}>
      <Icon className="size-4" />
    </span>
  );
}

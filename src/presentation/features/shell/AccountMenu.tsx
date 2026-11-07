import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { landingFor, ROLES } from '@domain/entities/Workflow';
import { pathOf } from '../../lib/areas';
import { cn } from '../../lib/utils';
import { useWorkStore } from '../../state/workStore';
import { RoleBadge } from '../home/roleInfo';

/** Who is signed in, with a quick way to change hats or sign out. */
export function AccountMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { name, role, setRole, signOut } = useWorkStore();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  const shown = name.trim() || t(`workflow.roles.${role}`);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border px-2 py-1 hover:bg-accent"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {shown.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-28 truncate text-sm font-medium">{shown}</span>
          <span className="block text-xs text-muted-foreground">{t(`workflow.roles.${role}`)}</span>
        </span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-1 w-64 rounded-lg border bg-card p-2 shadow-lg">
          <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('account.workingAs')}
          </p>
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              role="menuitemradio"
              aria-checked={r === role}
              onClick={() => {
                setRole(r);
                setOpen(false);
                navigate(pathOf(landingFor(r)));
              }}
              className={cn('flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-accent', r === role && 'bg-accent')}
            >
              <RoleBadge role={r} />
              <span className="text-sm">{t(`workflow.roles.${r}`)}</span>
            </button>
          ))}
          <div className="my-1 border-t" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              signOut();
              navigate('/');
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
          >
            <LogOut className="size-4" /> {t('account.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

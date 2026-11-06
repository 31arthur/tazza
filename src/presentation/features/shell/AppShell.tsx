import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { cn } from '../../lib/utils';
import { useEditionStore } from '../../state/editionStore';

const NAV = [
  { to: '/write', key: 'write' },
  { to: '/layout', key: 'layout' },
  { to: '/preview', key: 'preview' },
] as const;

export function AppShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const editionId = useEditionStore((s) => s.editionId);
  const setEditionId = useEditionStore((s) => s.setEditionId);

  return (
    <div className="flex h-screen flex-col print:block print:h-auto">
      <header className="no-print flex h-14 shrink-0 items-center gap-6 border-b bg-card px-4">
        <div className="flex items-baseline gap-2">
          <span lang="te" className="font-display text-xl font-bold">
            తాజా
          </span>
          <span className="text-sm font-semibold tracking-widest text-muted-foreground">TAZZA</span>
        </div>
        <nav className="flex gap-1">
          {NAV.map(({ to, key }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium',
                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                )
              }
            >
              {t(`nav.${key}`)}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            {t('edition.date')}
            <input
              type="date"
              value={editionId}
              onChange={(e) => e.target.value && setEditionId(e.target.value)}
              className="h-9 rounded-md border bg-transparent px-2 text-foreground"
            />
          </label>
          <LanguageSwitcher />
        </div>
      </header>
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="min-h-0 flex-1 print:block"
      >
        <Outlet />
      </motion.main>
    </div>
  );
}

import { motion } from 'framer-motion';
import { Image, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { canOpen, landingFor, type Area } from '@domain/entities/Workflow';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { AREA_INFO, pathOf } from '../../lib/areas';
import { cn } from '../../lib/utils';
import { useEditionStore } from '../../state/editionStore';
import { useWorkStore } from '../../state/workStore';
import { AccountMenu } from './AccountMenu';
import { SyncControl } from './SyncControl';
import { WorkflowRail } from './WorkflowRail';

const AREA_BY_PATH = new Map<string, Area>(
  (Object.keys(AREA_INFO) as Area[]).map((area) => [pathOf(area), area]),
);

const LIBRARY: { area: Area; icon: typeof Image }[] = [
  { area: 'photos', icon: Image },
  { area: 'templates', icon: Layers },
];

/**
 * The frame around every working screen: a slim top bar, the four-step rail, and the screen.
 * It also keeps people out of screens their role does not use.
 */
export function AppShell() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { signedIn, role } = useWorkStore();
  const editionId = useEditionStore((s) => s.editionId);
  const setEditionId = useEditionStore((s) => s.setEditionId);

  if (!signedIn) return <Navigate to="/" replace />;
  const area = AREA_BY_PATH.get(pathname);
  if (area && !canOpen(role, area)) return <Navigate to={pathOf(landingFor(role))} replace />;

  return (
    <div className="flex h-screen flex-col print:block print:h-auto">
      <header className="no-print flex h-14 shrink-0 items-center gap-4 border-b bg-card px-4">
        <Link to="/" className="flex items-baseline gap-2" title={t('shell.home')}>
          <span lang="te" className="font-display text-xl font-bold">
            తాజా
          </span>
          <span className="text-sm font-semibold tracking-widest text-muted-foreground">TAZZA</span>
        </Link>
        <nav className="flex gap-1">
          {LIBRARY.filter((l) => canOpen(role, l.area)).map(({ area: a, icon: Icon }) => (
            <NavLink
              key={a}
              to={pathOf(a)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent',
                  isActive && 'bg-accent font-medium text-foreground',
                )
              }
            >
              <Icon className="size-4" />
              <span className="hidden lg:inline">{t(`nav.${AREA_INFO[a].key}`)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="date"
            value={editionId}
            aria-label={t('edition.date')}
            title={t('edition.date')}
            onChange={(e) => e.target.value && setEditionId(e.target.value)}
            className="h-9 rounded-md border bg-transparent px-2 text-sm text-foreground"
          />
          <SyncControl />
          <LanguageSwitcher />
          <AccountMenu />
        </div>
      </header>
      <WorkflowRail />
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="min-h-0 flex-1 print:block"
      >
        <Outlet />
      </motion.main>
    </div>
  );
}

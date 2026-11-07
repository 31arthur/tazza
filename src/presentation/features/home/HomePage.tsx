import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CloudOff,
  Languages,
  LayoutTemplate,
  Palette,
  PenLine,
  Printer,
  SearchCheck,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { landingFor, ROLES, type Role } from '@domain/entities/Workflow';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { pathOf } from '../../lib/areas';
import { cn } from '../../lib/utils';
import { useWorkStore } from '../../state/workStore';
import { ROLE_INFO, RoleBadge } from './roleInfo';

const fade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5 },
} as const;

const STEPS = [
  { key: 'write', icon: PenLine, role: 'reporter' },
  { key: 'review', icon: SearchCheck, role: 'editor' },
  { key: 'arrange', icon: LayoutTemplate, role: 'designer' },
  { key: 'publish', icon: Printer, role: 'editor' },
] as const satisfies readonly { key: string; icon: unknown; role: Role }[];

const HELP = [
  { key: 'colour', icon: Palette },
  { key: 'spacing', icon: Wand2 },
  { key: 'language', icon: Languages },
  { key: 'team', icon: Users },
  { key: 'offline', icon: CloudOff },
  { key: 'checks', icon: Sparkles },
] as const;

/** The front door: what Tazza is, how a day works, and a mock sign-in that picks your role. */
export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { name: savedName, role: savedRole, signedIn, signIn, signOut } = useWorkStore();
  const [name, setName] = useState(savedName);
  const [role, setRole] = useState<Role>(savedRole);

  const enter = (as: Role = role, who: string = name) => {
    signIn(who, as);
    navigate(pathOf(landingFor(as)));
  };
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="h-screen overflow-y-auto scroll-smooth bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-6 border-b bg-card/90 px-6 backdrop-blur">
        <div className="flex items-baseline gap-2">
          <span lang="te" className="font-display text-xl font-bold">
            తాజా
          </span>
          <span className="text-sm font-semibold tracking-widest text-muted-foreground">TAZZA</span>
        </div>
        <nav className="hidden gap-5 text-sm text-muted-foreground md:flex">
          <button onClick={() => scrollTo('how')} className="hover:text-foreground">
            {t('home.navHow')}
          </button>
          <button onClick={() => scrollTo('roles')} className="hover:text-foreground">
            {t('home.navRoles')}
          </button>
          <button onClick={() => scrollTo('help')} className="hover:text-foreground">
            {t('home.navHelp')}
          </button>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitcher />
          <Button size="sm" onClick={() => scrollTo('signin')}>
            {signedIn ? t('home.continue') : t('home.signIn')}
          </Button>
        </div>
      </header>

      {/* Hero with the sign-in card */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.2fr_1fr]" id="signin">
        <motion.div {...fade}>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-amber-600" /> {t('home.badge')}
          </p>
          <h1 className="font-display text-5xl font-bold leading-tight tracking-tight md:text-6xl">
            {t('home.heroLine1')}
            <br />
            <span lang="te" className="text-[#c8102e]">
              {t('home.heroLine2')}
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">{t('home.heroText')}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {STEPS.map((s, i) => (
              <span key={s.key} className="flex items-center gap-3">
                <span className="font-medium text-foreground">{t(`rail.${s.key}`)}</span>
                {i < STEPS.length - 1 && <ArrowRight className="size-4" />}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div {...fade} transition={{ duration: 0.5, delay: 0.1 }} className="rounded-2xl border bg-card p-6 shadow-lg">
          {signedIn ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <RoleBadge role={savedRole} className="size-10" />
                <div>
                  <p className="font-semibold">{t('home.welcomeBack', { name: savedName.trim() || t(`workflow.roles.${savedRole}`) })}</p>
                  <p className="text-sm text-muted-foreground">{t(`home.roles.${savedRole}.title`)}</p>
                </div>
              </div>
              <Button size="lg" onClick={() => enter(savedRole, savedName)}>
                {t('home.openDesk')} <ArrowRight />
              </Button>
              <Button variant="ghost" onClick={signOut}>
                {t('account.signOut')}
              </Button>
            </div>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                enter();
              }}
            >
              <div>
                <h2 className="text-lg font-semibold">{t('home.signInTitle')}</h2>
                <p className="text-sm text-muted-foreground">{t('home.signInHint')}</p>
              </div>
              <label className="flex flex-col gap-1 text-sm">
                {t('home.yourName')}
                <Input value={name} placeholder={t('home.namePlaceholder')} onChange={(e) => setName(e.target.value)} />
              </label>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm">{t('home.yourRole')}</legend>
                {ROLES.map((r) => {
                  const { icon: Icon, tone } = ROLE_INFO[r];
                  return (
                    <label
                      key={r}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent',
                        role === r && 'border-primary bg-accent',
                      )}
                    >
                      <input type="radio" name="role" className="sr-only" checked={role === r} onChange={() => setRole(r)} />
                      <span className={cn('flex size-9 items-center justify-center rounded-full', tone)}>
                        <Icon className="size-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{t(`workflow.roles.${r}`)}</span>
                        <span className="block text-xs text-muted-foreground">{t(`home.roles.${r}.short`)}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
              <Button type="submit" size="lg">
                {t('home.enter')} <ArrowRight />
              </Button>
              <p className="text-center text-xs text-muted-foreground">{t('home.mockNote')}</p>
            </form>
          )}
        </motion.div>
      </section>

      {/* How a day works */}
      <section id="how" className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.h2 {...fade} className="font-display text-3xl font-bold">
            {t('home.howTitle')}
          </motion.h2>
          <motion.p {...fade} className="mt-3 max-w-2xl text-muted-foreground">
            {t('home.howText')}
          </motion.p>
          <ol className="mt-12 grid gap-6 md:grid-cols-4">
            {STEPS.map((step, i) => (
              <motion.li
                key={step.key}
                {...fade}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="relative rounded-xl border bg-background p-5"
              >
                <span className="absolute -top-3 left-5 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <step.icon className="size-7 text-[#c8102e]" />
                <h3 className="mt-4 font-semibold">{t(`home.steps.${step.key}.title`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`home.steps.${step.key}.text`)}</p>
                <p className="mt-3 text-xs font-medium text-muted-foreground">
                  {t('home.by', { role: t(`workflow.roles.${step.role}`) })}
                </p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="mx-auto max-w-6xl px-6 py-20">
        <motion.h2 {...fade} className="font-display text-3xl font-bold">
          {t('home.rolesTitle')}
        </motion.h2>
        <motion.p {...fade} className="mt-3 max-w-2xl text-muted-foreground">
          {t('home.rolesText')}
        </motion.p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {ROLES.map((r, i) => {
            const { icon: Icon, tone } = ROLE_INFO[r];
            return (
              <motion.div
                key={r}
                {...fade}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="flex flex-col rounded-xl border bg-card p-6"
              >
                <span className={cn('flex size-11 items-center justify-center rounded-full', tone)}>
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-4 text-xl font-semibold">{t(`workflow.roles.${r}`)}</h3>
                <p className="mt-1 text-sm font-medium text-muted-foreground">{t(`home.roles.${r}.title`)}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {[1, 2, 3].map((n) => (
                    <li key={n} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#c8102e]" />
                      {t(`home.roles.${r}.p${n}`)}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="mt-6" onClick={() => enter(r, name || savedName)}>
                  {t('home.signInAs', { role: t(`workflow.roles.${r}`) })}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Smart help */}
      <section id="help" className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.h2 {...fade} className="font-display text-3xl font-bold">
            {t('home.helpTitle')}
          </motion.h2>
          <motion.p {...fade} className="mt-3 max-w-2xl text-muted-foreground">
            {t('home.helpText')}
          </motion.p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {HELP.map(({ key, icon: Icon }, i) => (
              <motion.div
                key={key}
                {...fade}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                className="rounded-xl border bg-background p-5"
              >
                <Icon className="size-6 text-[#c8102e]" />
                <h3 className="mt-3 font-semibold">{t(`home.help.${key}.title`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`home.help.${key}.text`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <motion.h2 {...fade} className="font-display text-4xl font-bold">
          {t('home.ctaTitle')}
        </motion.h2>
        <motion.div {...fade} className="mt-8">
          <Button size="lg" onClick={() => scrollTo('signin')}>
            {t('home.ctaButton')} <ArrowRight />
          </Button>
        </motion.div>
      </section>
      <footer className="border-t px-6 py-6 text-center text-xs text-muted-foreground">{t('home.footer')}</footer>
    </div>
  );
}

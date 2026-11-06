import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

export function HomePage() {
  const { t, i18n } = useTranslation();
  const reduce = useReducedMotion();

  return (
    <div className="mx-auto max-w-3xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-4xl font-bold">{t('app.name')}</h1>
        <LanguageSwitcher />
      </header>
      <motion.main
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        lang={i18n.language}
      >
        <h2 className="font-serif text-2xl font-bold">{t('home.title')}</h2>
        <p className="mt-2 text-neutral-600">{t('home.subtitle')}</p>
        <p lang="te" className="mt-6 font-serif text-xl">
          {t('home.sample')}
        </p>
      </motion.main>
    </div>
  );
}

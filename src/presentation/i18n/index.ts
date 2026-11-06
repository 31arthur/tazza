import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import te from './locales/te.json';

const STORAGE_KEY = 'tazza.uiLanguage';
const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, te: { translation: te } },
  lng: stored === 'te' ? 'te' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  localStorage.setItem(STORAGE_KEY, lng);
});

export default i18n;

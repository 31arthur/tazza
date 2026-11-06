import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@presentation/styles/fonts';
import '@presentation/styles/globals.css';
import '@presentation/i18n';
import { HomePage } from '@presentation/features/home/HomePage';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <HomePage />
  </StrictMode>,
);

import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { exportCompanion } from './tools/exportCompanion';

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss(), exportCompanion()],
  resolve: {
    alias: {
      '@app': src('app'),
      '@domain': src('domain'),
      '@data': src('data'),
      '@presentation': src('presentation'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});

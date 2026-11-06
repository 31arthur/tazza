import js from '@eslint/js';
import globals from 'globals';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'scripts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { boundaries, 'react-hooks': reactHooks },
    settings: {
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain/**', partialMatch: false },
        { type: 'data', pattern: 'src/data/**', partialMatch: false },
        { type: 'presentation', pattern: 'src/presentation/**', partialMatch: false },
        { type: 'app', pattern: 'src/app/**', partialMatch: false },
      ],
      'import/resolver': { typescript: { project: './tsconfig.json' } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      'boundaries/dependencies': [
        2,
        {
          default: 'disallow',
          policies: [
            { from: { element: { type: 'domain' } }, allow: { to: { element: { type: 'domain' } } } },
            {
              from: { element: { type: 'data' } },
              allow: { to: { element: { types: ['data', 'domain'] } } },
            },
            {
              from: { element: { type: 'presentation' } },
              allow: { to: { element: { types: ['presentation', 'domain'] } } },
            },
            { from: { element: { type: 'app' } }, allow: { to: { element: { types: ['app', 'domain', 'data', 'presentation'] } } } },
          ],
        },
      ],
    },
  },
  {
    // The domain is pure: no framework, storage or browser globals.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react-dom', 'react/*', 'dexie', 'framer-motion', '@tiptap/*'] },
      ],
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'localStorage',
        'indexedDB',
        'navigator',
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Inject an IdGenerator.' },
        { object: 'Date', property: 'now', message: 'Inject a Clock.' },
      ],
    },
  },
);

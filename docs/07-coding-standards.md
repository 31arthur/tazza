# 07 · Coding Standards

## TypeScript

- `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.
- No `any`; use `unknown` and narrow. No non-null `!` outside tests.
- Branded types for IDs (`type ArticleId = string & { __brand: 'ArticleId' }`).
- Prefer `readonly` and immutable updates; entities return new instances.
- Path aliases: `@domain/*`, `@data/*`, `@presentation/*`, `@app/*`.

## SOLID applied to this codebase

| Principle | In Tazza |
|---|---|
| **S**ingle Responsibility | One use case per file with one `execute`. A repository only persists; a mapper only maps; a component either fetches (container hook) or renders. |
| **O**pen/Closed | New PDF engine, storage backend, article status or page template = add a class/data entry, not edit existing use cases. `PdfExporter` and `ArticleRepository` are the extension seams. |
| **L**iskov Substitution | Every `PdfExporter` returns an A3 PDF or throws `ExportError`; every repository adapter honours the same contract. Shared contract tests run against each adapter (Dexie, in-memory). |
| **I**nterface Segregation | Small role-based ports (`Clock`, `IdGenerator`, `Transliterator`) instead of a god "Services" interface. Components receive only the props they use. |
| **D**ependency Inversion | Use cases depend on port interfaces in `domain/ports`; `app/container.ts` supplies adapters. Components depend on use cases via hooks, never on Dexie or `fetch`. |

### Example: Open/Closed

```ts
// domain/ports/services/PdfExporter.ts
export interface PdfExporter { export(req: PdfExportRequest): Promise<PdfResult> }

// data/services/ChromiumPdfExporter.ts  (new adapter, nothing else edited but the container)
export class ChromiumPdfExporter implements PdfExporter { /* ... */ }
```

## Enforced boundaries

`eslint-plugin-boundaries` config summary:

```
domain        → may import: domain
data          → may import: domain, data
presentation  → may import: domain, presentation
app           → may import: domain, data, presentation, app
```

Extra rules:
- `no-restricted-imports` in `domain`: `react`, `dexie`, `framer-motion`, `@tiptap/*`, anything from `window`.
- `no-restricted-globals` in `domain`: `window`, `document`, `localStorage`, `Date` constructor with no args, `Math.random`.
- CI fails on violations.

## Naming and files

| Thing | Convention | Example |
|---|---|---|
| Entity / VO / class | PascalCase, file same name | `Article.ts` |
| Use case | Verb phrase | `PlaceArticleInBlock.ts` |
| Port | Noun, no `I` prefix | `ArticleRepository.ts` |
| Adapter | Tech prefix + port | `DexieArticleRepository.ts` |
| React component | PascalCase `.tsx` | `BlockFrame.tsx` |
| Hook | `useXxx` | `useAutosave.ts` |
| Tests | beside source, `.test.ts(x)` | `Article.test.ts` |
| Booleans | `is/has/can` | `isOverflowing` |

Use named exports; default export only for route-level lazy components.

## React

- Function components, hooks only. Keep components under ~150 lines; extract hooks and sub-components.
- Fetch through `useUseCase` + TanStack Query; no `useEffect` for data fetching.
- Side effects in hooks, not in render. Memoise only with a measured reason.
- Derived data computed, not stored. UI state in Zustand slices per feature; no global mega-store.
- The editor component is controlled through a narrow interface (`value: ArticleBody`, `onChange`), so TipTap is replaceable.

## Error and null handling

- Throw typed errors for exceptional cases; return `undefined`/empty arrays for "not found" only where the port documents it (`getById` throws `NotFound`).
- Never use empty `catch`. Log with the `Logger` port and surface to the user.

## Styling

- Tailwind utility classes with shadcn tokens; variants via `cva`.
- Page geometry via CSS variables in mm. No magic pixel numbers in print components.
- No inline `style` except for dynamic geometry (block placement).

## Git and review

- Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`).
- Small PRs; each includes tests and, where the architecture changes, an entry in [10-decisions.md](10-decisions.md).
- Definition of done: types pass, lint passes (boundaries included), tests pass, new UI strings exist in `en` and `te`, no console errors.

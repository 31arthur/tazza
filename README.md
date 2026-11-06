# Tazza (తాజా)

A daily newspaper editor for writing, laying out and printing news in **Telugu and English**. Write the day's articles, place them on pages, and export print-ready **A3 PDFs** at the end of the day.

> *Tazza* means "fresh" — fresh news, every day.

## Objective

Give a small newsroom one tool for the whole daily cycle:

1. Open today's **edition**.
2. Write articles in Telugu, English, or both, with a proper rich-text editor.
3. Place articles on **A3 pages** using a newspaper column grid.
4. Proof the pages and export a **PDF (297 × 420 mm)** ready for the press.

## Tech stack

| Concern | Choice |
|---|---|
| UI | React 19 + TypeScript (strict) |
| Build | Vite |
| Components | shadcn/ui (Radix + Tailwind CSS) |
| Motion | Framer Motion |
| Rich-text editor | TipTap (ProseMirror) |
| Local storage | IndexedDB via Dexie (local-first, no backend needed) |
| UI state | Zustand |
| UI i18n | i18next (`en`, `te`) |
| Drag and drop | dnd-kit |
| PDF | Chromium print pipeline behind a `PdfExporter` port (see docs) |
| Tests | Vitest, Testing Library, Playwright |

## Architecture in one picture

```
presentation  ──depends on──▶  domain  ◀──implemented by──  data
 (React, UI)                (entities, use cases,           (Dexie, PDF,
                             repository ports)               file adapters)
```

Dependencies point **inward** to the domain. The domain imports nothing from React, Dexie or the browser. See [docs/02-architecture.md](docs/02-architecture.md).

## Documentation

| Doc | What it covers |
|---|---|
| [docs/01-product-requirements.md](docs/01-product-requirements.md) | Users, daily workflow, features, scope |
| [docs/02-architecture.md](docs/02-architecture.md) | Clean architecture layers, folder layout, dependency rules |
| [docs/03-domain-model.md](docs/03-domain-model.md) | Entities, value objects, use cases, repository ports |
| [docs/04-editor-and-language-support.md](docs/04-editor-and-language-support.md) | Rich-text editor, Telugu and English handling, fonts, input |
| [docs/05-layout-and-pdf-export.md](docs/05-layout-and-pdf-export.md) | A3 page grid, copyfitting, PDF pipeline |
| [docs/06-ui-ux-guidelines.md](docs/06-ui-ux-guidelines.md) | Screens, shadcn usage, Framer Motion rules |
| [docs/07-coding-standards.md](docs/07-coding-standards.md) | SOLID applied, naming, lint-enforced boundaries |
| [docs/08-testing-strategy.md](docs/08-testing-strategy.md) | Test pyramid, Telugu and PDF verification |
| [docs/09-roadmap.md](docs/09-roadmap.md) | Phased delivery plan |
| [docs/10-decisions.md](docs/10-decisions.md) | Architecture decision log |
| [CLAUDE.md](CLAUDE.md) | Rules for AI coding agents working in this repo |

## Getting started (once scaffolded)

```bash
pnpm install
pnpm dev          # start Vite
pnpm test         # unit + component tests
pnpm lint         # ESLint incl. architecture boundary rules
pnpm build
```

Phases 0-2 of the [roadmap](docs/09-roadmap.md) are working end to end (write, lay out, preview/print A3). Still open: Playwright, CI workflow, dark theme, one-click PDF export. TypeScript is pinned to 6.x because typescript-eslint does not support 7 yet.

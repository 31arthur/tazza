# 09 · Roadmap

Each phase ends with something usable in a real daily cycle.

## Phase 0 · Foundation
- Scaffold Vite + React + TS (strict), Tailwind, shadcn init, Framer Motion, i18next, Vitest, Playwright.
- Create `src/{app,domain,data,presentation}` layout and path aliases.
- ESLint boundary rules, Prettier, CI workflow.
- Self-host fonts (Noto Serif/Sans Telugu, Source Serif 4, Playfair Display, Inter).
- App shell with en/te language switch and light/dark theme.

**Done when:** `pnpm dev/build/test/lint` pass; a Telugu and English string render with correct fonts in the shell.

## Phase 1 · Write (MVP)
- Domain: `Edition`, `Article`, `Language`, status workflow, use cases, in-memory fakes.
- Data: Dexie database, repositories, mappers, contract tests.
- Edition dashboard: create today's edition.
- Article desk (list, filter, create, delete).
- TipTap editor with schema, language toggle, autosave, word count, images.
- Telugu fixtures and NFC handling.

**Done when:** a writer can create today's edition and write/save a full bilingual article that survives reload.

## Phase 2 · Lay out and export (A3)
- Domain: `Page`, `Block`, `PageGrid`, templates, placement invariants, `CopyfitEstimator`.
- `PageRenderer` with real mm geometry and multi-column flow.
- Layout canvas: palette, drag-and-drop, resize, overflow indicators, zoom, guides.
- Print route and `BrowserPrintExporter` (A3, margin 0).
- Masthead, running header, folio.
- PDF verification tests.

**Done when:** an edition of several pages exports to an A3 PDF with correct Telugu shaping and embedded fonts.

## Phase 3 · Production polish
- `ChromiumPdfExporter` companion (Playwright) for one-click, deterministic export.
- Bleed and crop marks, greyscale option, image dpi warnings.
- Phonetic Telugu transliteration mode.
- Edition bundle export/import (`.tazza.json`), duplicate edition structure.
- Version history snapshots per article; crash recovery.
- PWA/offline support.

## Phase 4 · Newsroom scale (optional)
- Linked text frames (continued stories), jump lines.
- Telugu spellcheck via word list behind `SpellChecker` port.
- Remote sync adapter (REST/Supabase) behind existing repository ports, with auth and roles.
- Desktop shell (Tauri/Electron) with `DesktopPdfExporter`.
- Legacy Telugu font text converter.
- CMYK / PDF/X post-processing.

## Open questions

1. Publication name, masthead artwork and fixed section list?
2. Number of pages per day and the standard page templates?
3. Does the press require bleed/crop marks or a specific PDF profile?
4. Single machine or several writers sharing the data (decides when remote sync is needed)?
5. Preferred Telugu typeface for body and headlines (needs licence check)?
6. Is phonetic typing required from day one, or is the OS keyboard enough?

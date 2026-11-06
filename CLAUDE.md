# CLAUDE.md

Guidance for AI coding agents working on Tazza, a bilingual (Telugu/English) newspaper editor that exports A3 PDFs. Read [README.md](README.md) and [docs/02-architecture.md](docs/02-architecture.md) first.

## Stack

React + TypeScript (strict) + Vite + shadcn/ui + Tailwind + Framer Motion + TipTap + Dexie + Zustand. Package manager: pnpm.

## Architecture rules (non-negotiable)

- Three layers under `src/`: `domain/`, `data/`, `presentation/`. Wiring lives only in `src/app/` (composition root).
- Allowed imports: `presentation → domain`, `data → domain`, `app → all`. Never `domain → anything else`, never `presentation ↔ data`.
- `domain/` is pure TypeScript: no React, no Dexie, no `window`, no `Date.now()` (inject a `Clock`), no `crypto` (inject an `IdGenerator`).
- UI talks to the domain through **use cases** obtained from the DI container, never to repositories or Dexie directly.
- New external capability (storage, PDF, fonts, file I/O) = new **port** in `domain/` + **adapter** in `data/`.
- Follow SOLID as described in [docs/07-coding-standards.md](docs/07-coding-standards.md). One use case per file, one `execute` method.

## Language rules

- All text is Unicode, stored NFC-normalized. Never strip or transform Telugu code points (ZWJ/ZWNJ matter).
- Language is never chosen by the writer: it is detected from the text (`detectLanguage`), and every rendered text block carries the resulting `lang` attribute and font stack.
- Never hard-code UI strings; use i18next keys in both `en` and `te` locale files.
- Do not enable CSS `hyphens` for Telugu.

## Print rules

- Page size is A3: 297 × 420 mm. Use millimetres in domain and CSS (`mm`), never px, for page geometry.
- Anything shown in the layout preview must be rendered by the same component used for export, so preview equals PDF.

## Commands

```bash
pnpm dev | pnpm build | pnpm test | pnpm lint | pnpm typecheck | pnpm e2e
```

Run `pnpm lint && pnpm typecheck && pnpm test` before declaring work done.

## Before adding a dependency

Check it handles Telugu (complex script shaping) if it touches text rendering. Prefer existing stack choices in [docs/10-decisions.md](docs/10-decisions.md).

## Git workflow

- One branch per feature or fix (`feature/…`, `fix/…`, `docs/…`) cut from the default branch (`dev`; there is no `main`).
- Commit on the branch, push it (`git push -u origin <branch>`), merge it back into `dev` with `git merge --no-ff`, then push `dev`.
- Run `pnpm lint && pnpm typecheck && pnpm test` before each merge.

# 08 · Testing Strategy

## Pyramid

| Level | Tool | Scope | Share |
|---|---|---|---|
| Unit (domain) | Vitest | Entities, VOs, use cases with fakes, copyfit | ~60 % |
| Contract | Vitest | Same suite run against every adapter of a port | ~10 % |
| Component | Vitest + Testing Library | Features with fake container | ~20 % |
| E2E | Playwright | Daily workflow in a real browser | ~10 % |

## Domain tests

- No mocks of frameworks; use **in-memory fakes** (`InMemoryArticleRepository`, `FixedClock`, `SequentialIdGenerator`) in `domain/testing/`.
- Cover every status transition (legal and illegal), block overlap rules, grid bounds, edition uniqueness per date.
- Property-based tests (fast-check) for `GridPlacement` collision logic.

## Contract tests

```ts
export function articleRepositoryContract(make: () => Promise<ArticleRepository>) { /* shared cases */ }
// run for InMemoryArticleRepository and DexieArticleRepository (fake-indexeddb)
```

Guarantees Liskov substitution between adapters. Same pattern for `AssetRepository`.

## Component tests

- Render features inside a `TestContainerProvider` with fakes.
- Assert behaviour (roles, labels), not implementation. Framer Motion is mocked to instant in tests.
- Editor: type text, change language, verify the mapper produces the expected `ArticleBody`.

## Telugu verification fixtures

A fixture file `tests/fixtures/telugu-samples.ts` holds hard cases:

- conjuncts: `క్ష`, `స్త్ర`, `ర్చ్చి`, `ప్రభుత్వం`
- vowel signs and anusvara/visarga: `కి కీ కు కూ కృ కె కే కై కొ కో కౌ కం కః`
- ZWJ/ZWNJ cases, Telugu + Latin + digits mixed lines
- long headline and a 400-word paragraph

Tests:
1. NFC round trip: save → load → identical code points.
2. Word counter on mixed text.
3. Phonetic transliterator table: input → expected output (golden list).
4. E2E: type via `page.keyboard.insertText` (simulates IME commit) and assert stored text.
5. Visual snapshot of the fixtures rendered in the editor and in `PageRenderer` (guards shaping regressions and font fallback).

## PDF verification (E2E)

After exporting a sample edition in Playwright:

| Check | Method |
|---|---|
| Page count | `pdf-lib` / `pdfinfo` |
| Page size A3 | MediaBox ≈ 841.89 × 1190.55 pt |
| Fonts embedded | `pdffonts` shows `emb yes` for every font |
| Telugu text extractable | `pdftotext` contains expected strings |
| Visual | Rasterise page 1 at 100 dpi with `pdftoppm`, compare to baseline (`pixelmatch`, threshold 0.1 %) |
| Overflow | Export is refused (or warned) if a fixture article overflows |

Pin the Playwright Chromium version so line-break baselines are stable.

## Architecture tests

- Lint-based boundary rules (see [07](07-coding-standards.md)).
- A `dependency-cruiser` check in CI fails on cycles and on `domain` importing outside itself.
- Script `scripts/check-i18n.ts` fails if `en.json` and `te.json` keys differ.

## Accessibility

`axe` in Playwright on dashboard, desk, editor, layout. No serious or critical violations.

## CI pipeline

```
install → typecheck → lint (incl. boundaries) → i18n check → unit/contract/component → build → e2e (+ PDF checks)
```

## Coverage targets

Domain ≥ 90 % lines; data ≥ 80 %; presentation ≥ 70 %. Coverage guides, not replaces, judgment: the Telugu and PDF checks above are mandatory regardless.

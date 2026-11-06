# 02 · Architecture

Clean Architecture with three layers: **domain**, **data**, **presentation**, plus a thin **composition root** (`app`).

## Dependency rule

```
          ┌──────────────────────────┐
          │       presentation       │  React, shadcn, Framer Motion, TipTap
          └─────────────┬────────────┘
                        │ imports
                        ▼
          ┌──────────────────────────┐
          │          domain          │  entities, value objects, use cases, ports
          └─────────────▲────────────┘
                        │ implements
          ┌─────────────┴────────────┐
          │           data           │  Dexie, PDF adapter, file adapters, mappers
          └──────────────────────────┘

   app/ (composition root) imports all three and wires ports → adapters.
```

| From → To | Allowed |
|---|---|
| presentation → domain | Yes |
| data → domain | Yes |
| app → any | Yes |
| domain → presentation / data / libraries with side effects | **No** |
| presentation ↔ data | **No** |

Enforced by `eslint-plugin-boundaries` (or `dependency-cruiser`) in CI.

## Folder layout

```
src/
├── app/                         # composition root
│   ├── container.ts             # DI: builds adapters, injects into use cases
│   ├── providers.tsx            # React context providers
│   └── main.tsx
├── domain/
│   ├── entities/                # Edition, Page, Article, Asset, Section
│   ├── value-objects/           # EditionDate, Language, PageSize, Millimetres, GridPlacement
│   ├── errors/                  # DomainError subclasses
│   ├── ports/                   # interfaces the domain needs
│   │   ├── repositories/        # ArticleRepository, EditionRepository, AssetRepository
│   │   └── services/            # PdfExporter, Clock, IdGenerator, Transliterator, BundleCodec
│   ├── services/                # pure domain logic: CopyfitEstimator, WordCounter
│   └── usecases/
│       ├── edition/             # CreateEdition, OpenEdition, ChangeEditionStatus ...
│       ├── article/             # CreateArticle, UpdateArticle, ChangeArticleStatus ...
│       ├── layout/              # PlaceArticle, ResizeBlock, AddPage ...
│       └── export/              # ExportEditionPdf, ExportBundle, ImportBundle
├── data/
│   ├── datasources/             # Dexie db, schema, migrations
│   ├── dto/                     # persistence shapes (versioned)
│   ├── mappers/                 # dto ⇄ entity
│   ├── repositories/            # DexieArticleRepository, ...
│   └── services/                # ChromiumPdfExporter, BrowserPrintExporter,
│                                # SystemClock, UuidGenerator, PhoneticTeluguTransliterator
└── presentation/
    ├── components/ui/           # shadcn primitives (generated)
    ├── components/              # shared, domain-agnostic components
    ├── features/
    │   ├── editions/            # dashboard
    │   ├── articles/            # list, article form, editor (TipTap)
    │   ├── layout/              # page canvas, block, palette
    │   └── export/              # preview + export dialog
    ├── print/                   # PageRenderer used by BOTH preview and export
    ├── hooks/                   # useUseCase, useAutosave
    ├── state/                   # Zustand stores (UI state only)
    ├── i18n/                    # i18next config + en.json, te.json
    ├── styles/                  # Tailwind, tokens, @page rules, fonts
    └── routes.tsx
```

## Layer responsibilities

### Domain
- **Entities** hold identity and invariants (`Article.changeStatus()` rejects illegal transitions).
- **Value objects** are immutable and validated at construction (`Language`, `Millimetres`).
- **Use cases** are single-purpose classes with `execute(input): Promise<output>`. They orchestrate entities and ports.
- **Ports** are interfaces named for what the domain needs, not how it is done.
- No framework, no I/O, no globals. Time and IDs are injected.

### Data
- **Repositories** implement domain ports using Dexie. They map DTO ⇄ entity through mappers; entities never leak persistence concerns.
- **Services** implement non-persistence ports: PDF export, ID generation, clock, transliteration, bundle encoding.
- DTOs are versioned; Dexie migrations upgrade old rows.

### Presentation
- React components only render and dispatch. They get use cases via `useUseCase(token)`.
- **State**: server-like data fetched through use cases and cached with TanStack Query; ephemeral UI state (selected block, zoom, panel open) in Zustand.
- Entities are mapped to **view models** at the feature boundary when the UI needs derived/formatted fields.
- `presentation/print/PageRenderer` is the single renderer for page layout. The preview screen and the PDF exporter both use it.

### Composition root (`app/`)
Only place that does `new DexieArticleRepository(db)`. Swapping Dexie for a REST backend means writing new adapters and changing `container.ts`.

## Data flow example: "Save article"

```
ArticleEditor (presentation)
  → useUseCase(UpdateArticle).execute({ id, body, headline })
      → UpdateArticle (domain) loads via ArticleRepository (port)
      → Article.update() validates invariants, bumps updatedAt (Clock port)
      → ArticleRepository.save(article)
          → DexieArticleRepository (data) maps entity → DTO → IndexedDB
  ← returns Article → mapped to ArticleViewModel → UI shows "Saved"
```

## Error handling

- Domain throws typed `DomainError` subclasses (`IllegalStatusTransition`, `PageBlockOverlap`).
- Use cases return results or throw domain errors; adapters wrap infrastructure failures in `InfrastructureError`.
- Presentation maps errors to toasts (shadcn `sonner`) and inline messages; nothing swallows errors silently.

## Cross-cutting

| Concern | Approach |
|---|---|
| Dependency injection | Plain constructor injection; a typed `Container`; React context exposes it |
| Validation | Value-object constructors; zod only at the data boundary (DTO parse) |
| Logging | `Logger` port; console adapter in dev |
| Config | `import.meta.env` read only in `app/` |
| Time / IDs | `Clock`, `IdGenerator` ports |

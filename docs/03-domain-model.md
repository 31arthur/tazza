# 03 · Domain Model

Pure TypeScript. No framework imports.

## Entities

```
Edition 1 ──── * Page 1 ──── * Block ──── 0..1 Article
   │                                          │
   └── * Article (belongs to edition) ────────┘
                         └── * AssetRef ──▶ Asset
```

### Edition
| Field | Type | Notes |
|---|---|---|
| id | `EditionId` | |
| date | `EditionDate` | calendar date, unique per publication |
| masthead | `Masthead` | name (te/en), tagline, logo asset |
| issueNumber, volume | number | auto-incremented |
| status | `EditionStatus` | `Open → Layout → Ready → Exported` |
| pages | `Page[]` | ordered |

### Page
| Field | Type | Notes |
|---|---|---|
| number | number | 1-based |
| size | `PageSize` | A3 default: 297 × 420 mm |
| grid | `PageGrid` | columns (6), gutter, margins in mm |
| template | `TemplateId` | |
| blocks | `Block[]` | non-overlapping |

### Block
A rectangle on the grid that holds one article (or an ad/placeholder later).

| Field | Notes |
|---|---|
| placement | `GridPlacement { col, colSpan, row, rowSpan }` in grid modules |
| articleId | optional |
| role | `Lead`, `Secondary`, `Brief`, `Photo`, `Ad` |
| flowsTo | optional next `BlockId` for continued text (Phase 2) |

Invariants: blocks stay inside the grid; blocks never overlap; one article appears in at most one primary block per edition.

### Article
| Field | Type | Notes |
|---|---|---|
| id | `ArticleId` | |
| editionId | `EditionId` | |
| language | `Language` | `te` or `en` (default for body) |
| headline, subHeadline | `RichLine` | text + lang |
| byline, dateline | string | |
| body | `ArticleBody` | editor-agnostic document tree (see below) |
| section | `Section` | Local, State, National, World, Sports, Editorial, Business, Entertainment |
| tags | string[] | |
| assets | `AssetRef[]` | image, caption, credit, crop |
| status | `ArticleStatus` | `Draft → InReview → Approved → Placed` |
| createdAt, updatedAt | `Instant` | from `Clock` |

Transitions: `Draft→InReview`, `InReview→Approved|Draft`, `Approved→Placed|InReview`, `Placed→Approved`. Anything else throws `IllegalStatusTransition`.

### ArticleBody
Stored as a small, editor-agnostic tree so the domain and storage do not depend on TipTap's JSON.

```ts
type Node =
  | { type: 'paragraph'; lang: Language; children: Inline[] }
  | { type: 'subhead';   lang: Language; children: Inline[] }
  | { type: 'pullquote'; lang: Language; children: Inline[] }
  | { type: 'list'; ordered: boolean; items: Inline[][] };

type Inline = { text: string; marks?: ('bold' | 'italic' | 'underline')[]; lang?: Language };
```

A presentation-layer mapper converts `ArticleBody ⇄ TipTap JSON`. Swapping the editor means rewriting only that mapper.

### Asset
`{ id, mimeType, widthPx, heightPx, byteSize, blobRef }`. Blob bytes live in the data layer; the domain sees metadata only.

## Value objects

| VO | Rule |
|---|---|
| `Language` | `'te' \| 'en'` |
| `Millimetres` | finite, ≥ 0 |
| `PageSize` | `A3 = 297 × 420`; `A4` allowed for proofs |
| `EditionDate` | ISO `YYYY-MM-DD`, no time zone logic |
| `GridPlacement` | integers ≥ 0, span ≥ 1 |
| `Instant` | epoch ms from `Clock` |

## Use cases

One class per file. Input and output are plain data objects.

| Group | Use cases |
|---|---|
| Edition | `CreateEdition`, `OpenEdition`, `ListEditions`, `ChangeEditionStatus`, `DuplicateEditionStructure` |
| Article | `CreateArticle`, `GetArticle`, `UpdateArticle`, `DeleteArticle`, `ListArticles`, `ChangeArticleStatus`, `AttachAsset` |
| Layout | `AddPage`, `RemovePage`, `ApplyTemplate`, `PlaceArticleInBlock`, `ResizeBlock`, `ClearBlock`, `AutoPlaceArticles` |
| Fit | `EstimateCopyfit` (uses `CopyfitEstimator`) |
| Export | `ExportEditionPdf`, `ExportEditionBundle`, `ImportEditionBundle` |

Example:

```ts
export class ChangeArticleStatus {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly clock: Clock,
  ) {}

  async execute({ id, to }: { id: ArticleId; to: ArticleStatus }): Promise<Article> {
    const article = await this.articles.getById(id);
    const updated = article.changeStatus(to, this.clock.now()); // throws on illegal transition
    await this.articles.save(updated);
    return updated;
  }
}
```

## Ports

### Repositories
```ts
interface ArticleRepository {
  getById(id: ArticleId): Promise<Article>;
  listByEdition(id: EditionId, filter?: ArticleFilter): Promise<Article[]>;
  save(article: Article): Promise<void>;
  delete(id: ArticleId): Promise<void>;
}
interface EditionRepository { /* getById, getByDate, list, save */ }
interface AssetRepository   { /* put(blob, meta), getMeta, getBlob, delete */ }
```

### Services
```ts
interface Clock { now(): Instant }
interface IdGenerator { next(): string }
interface PdfExporter { export(request: PdfExportRequest): Promise<PdfResult> }
interface Transliterator { toTelugu(latin: string): string }
interface BundleCodec { encode(edition: EditionBundle): Promise<Blob>; decode(file: Blob): Promise<EditionBundle> }
```

Interfaces are small and role-based (Interface Segregation): a use case that only reads articles depends on a read-only interface if it helps.

## Domain services

- **CopyfitEstimator**: estimates how many lines/columns an article needs given characters per line for the language, font size and column width. Telugu glyphs are wider than Latin, so each language has its own average-character-width table.
- **WordCounter**: counts words for both scripts (split on whitespace; Telugu has no case, digits may be Latin or Telugu).
- **ReadingTime** (optional).

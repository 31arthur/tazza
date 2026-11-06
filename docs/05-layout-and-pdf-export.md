# 05 · Layout and A3 PDF Export

## Page geometry

| Property | Value |
|---|---|
| Trim size | A3 portrait: **297 × 420 mm** (841.89 × 1190.55 pt) |
| Margins | 10 mm outer, 12 mm top (header), 10 mm bottom (folio) |
| Columns | 6 |
| Gutter | 4 mm |
| Column width | (297 − 20 − 5×4) / 6 ≈ 42.8 mm |
| Row module | 10 mm (vertical snapping unit) |
| Bleed (optional) | 3 mm each side → 303 × 426 mm media box |
| Crop marks (optional) | 5 mm offset, drawn in the bleed area |

All geometry is defined in **millimetres** as `PageGrid` in the domain and exposed to CSS as variables (`--page-w: 297mm`, `--col-gap: 4mm` …). Never use px for page geometry.

## Layout model

```
Page
 └─ Block { col, colSpan, row, rowSpan, role, articleId? }
```

- Blocks snap to the 6-column grid and to 10 mm vertical modules.
- Blocks cannot overlap or leave the live area (`PlaceArticleInBlock`, `ResizeBlock` enforce this).
- Inside a block, article content is composed: headline → sub-headline → byline → image(s) → body.
- Body text flows into `colSpan` CSS columns: `column-count: N; column-gap: 4mm; column-fill: auto` with the block height fixed, so text fills column 1 then column 2.

### Roles

| Role | Typical size | Style |
|---|---|---|
| Lead | 4–6 cols × large | Large headline, photo, long body |
| Secondary | 2–3 cols | Medium headline |
| Brief | 1–2 cols | Small headline, short text |
| Photo | any | Image and caption only |
| Ad | any | Placeholder box for externally supplied artwork |

### Templates

Templates are data (JSON) in the domain: a list of block placements with roles. Applying a template creates empty blocks. Built-in set: Front page, Inner 2-up, Editorial, Sports, Briefs. Users can save the current page as a template.

## Copyfitting

**Estimate (domain, instant):** `CopyfitEstimator` uses characters-per-line per language × font size × column width to predict needed lines and compare to the block's capacity. Shows green / amber / red badges in the article list and on blocks.

**Measure (presentation, exact):** after render, compare `scrollHeight` of the block's content with its fixed height. If larger → mark overflow, show a red edge and "overflow by N lines". Phase 2 offers "Fit" helpers: reduce headline size one step, tighten leading to a limit, or flow into a linked block (`flowsTo`).

Rule: the app warns but never silently truncates content.

## Single renderer

`presentation/print/PageRenderer` renders one page to DOM at real physical size (mm). It is used by:

1. the **layout canvas** (scaled with CSS `transform: scale()` for screen);
2. the **preview**;
3. the **PDF exporter** (rendered unscaled in a print route).

Because they share one component, preview equals PDF (FR-X4). Editing chrome (handles, dotted guides) is added by wrapper components and hidden in print by `@media print`.

## Print stylesheet

```css
@page { size: 297mm 420mm; margin: 0; }          /* A3 */
@media print {
  html, body { margin: 0; background: #fff; }
  .page { width: 297mm; height: 420mm; break-after: page; overflow: hidden; }
  .no-print { display: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```

With bleed enabled, `@page` becomes `303mm 426mm` and `.page` gets 3 mm padding with crop marks drawn in it.

## PDF pipeline

Telugu requires **complex-script shaping** (HarfBuzz-class). Pure-JS PDF libraries such as jsPDF or pdf-lib do not shape Indic scripts reliably, so they are rejected for body text. The renderer that already shapes Telugu correctly on screen is Chromium, so the PDF is produced by Chromium.

The `PdfExporter` port has interchangeable adapters:

| Adapter | How | When |
|---|---|---|
| `BrowserPrintExporter` | Opens `/print/:editionId` in a new tab and calls `window.print()`; user picks "Save as PDF", size A3, margins None, scale 100 | **Phase 1**, no infrastructure |
| `ChromiumPdfExporter` | Local companion (Node + Playwright) loads `/print/:editionId` and calls `page.pdf({ width:'297mm', height:'420mm', printBackground:true, preferCSSPageSize:true })` | **Phase 2**, one-click export, deterministic |
| `DesktopPdfExporter` | Electron/Tauri shell uses `webContents.printToPDF` | **Phase 3** if packaged as a desktop app |

Use cases depend on `PdfExporter` only. Adding an adapter touches `data/` and `app/container.ts` (Open/Closed Principle).

### Export request

```ts
interface PdfExportRequest {
  editionId: EditionId;
  pages?: number[];          // default: all
  bleed: boolean;
  cropMarks: boolean;
  quality: 'proof' | 'print'; // image downsampling policy
}
interface PdfResult { blob: Blob; pageCount: number; fileName: string } // e.g. tazza-2026-11-06.pdf
```

### Export steps

1. `ExportEditionPdf` verifies the edition: no overflowing blocks, no empty required blocks, all fonts loaded (`document.fonts.ready`). Warnings can be overridden for proofs.
2. Calls `PdfExporter.export`.
3. Print route renders every page via `PageRenderer`, waits for fonts and images (`decode()`), signals `window.__READY__ = true`.
4. Adapter captures PDF and returns it; the UI offers download and "Open folder".
5. Edition status moves to `Exported` (with the PDF timestamp).

### Images

- Original blobs are kept untouched; the renderer uses a cropped/scaled derivative.
- `print` quality requires ≥ 200 effective dpi at placed size; below that the layout shows a "low resolution" badge.
- Greyscale conversion option for black-and-white press runs.

### Fonts in the PDF

Chromium embeds subsetted fonts and keeps text selectable. Because fonts are self-hosted and preloaded, the PDF output does not depend on the machine's installed fonts.

## Verification

Automated checks run against an exported PDF (see [08-testing-strategy.md](08-testing-strategy.md)):

- page count equals the edition's page count;
- each page's MediaBox is 841.89 × 1190.55 pt (±0.5);
- Telugu sample text is extractable with correct Unicode order;
- fonts are embedded (`pdffonts`);
- visual snapshot of page 1 matches the baseline within tolerance.

## Risks

| Risk | Mitigation |
|---|---|
| Browser print dialog alters scale/margins | `@page` size + `margin:0`; on-screen checklist; Phase 2 companion removes the dialog |
| Chromium update shifts line breaks | Pin Playwright's Chromium version; visual regression test |
| Large images make PDF huge | Downsample derivatives to target dpi before render |
| Press needs CMYK / PDF/X | Out of scope; revisit with Ghostscript post-process |

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

A page is a **tiling**, like a newspaper paste-up: the live area is split into rows and columns until every rectangle (a *tile*) holds one story.

```
Page.layout : LayoutNode
  Leaf  { role, priority?, articleId? }                 one story
  Split { direction: row | column, children, sizes }    row: side by side, sizes = column counts (sum 6)
                                                        column: stacked, sizes = relative heights
```

- The tiles always cover the page, so there are no gaps to manage and no overlaps to forbid. Moving a story re-divides space; everything else re-fits around it.
- Row widths snap to the 6-column grid, so text always lines up with the columns.
- Inside a tile a story is composed as: headline → sub-headline → byline → **hero photo** (first image; grows or shrinks to use spare height, capped at 3:2) → body in `cols` balanced CSS columns. Further images flow inside the columns.

### Fit engine (`domain/layout/fit.ts`)

- `needMm(node, cols)` estimates the height a story needs at a given width (`CopyfitEstimator`).
- Side-by-side stories share the columns so the **tallest is as short as possible** (the neediest story keeps getting the next column).
- Stacked stories get their needed height; spare height goes to stories with photos, else proportionally.
- `pageFill` = needed ÷ available height. Over 100% the page is shown as **Overfull** and tiles show a red "does not fit" bar; nothing is silently cut.

### Moving stories (drag and drop)

| Drop on a tile's… | Result |
|---|---|
| middle | fill an empty tile, or swap stories |
| left/right edge | place the story beside it (splits the row, taking a column) |
| top/bottom edge | place the story above/below it |

After every change the page is re-fitted. Thin dividers between tiles can be dragged to resize by hand (columns snap; heights are free). A story lives in exactly one tile.

### Roles

| Role | Style |
|---|---|
| Banner | Very large headline, full width, wide photo |
| Lead | Large headline with photo |
| Story | Standard |
| Boxed | Tinted panel with border |
| Brief | Small headline and text |

### Style system

Each role has a **preset style** (`domain/layout/style.ts`); a tile may override any field. Colour is coded from a fixed palette, not freehand.

| Field | Options |
|---|---|
| Accent colour | ink, red, blue, green, amber (kicker, deck, box outline, jump line) |
| Headline colour | black ink or the accent (red for the most urgent) |
| Background tint | none, yellow, blue, pink, green, grey |
| Frame | rule below (standard), box (accent outline), none |
| Headline font | serif, sans bold, heavy display |
| Kicker, jump line | free text (e.g. `SPORTS`, `2 >>`) |
| Headline over photo | banner style: white outlined headline printed on the lead photo |
| Deck band | deck on a yellow band in the accent colour |

Rule weights are fixed: hairline 0.2 mm between columns, standard 0.3 mm between stories, heavy 0.8 mm under banners and the masthead. Articles may carry a **dateline** (place name) set bold in the accent colour at the start of the first paragraph.

The **masthead** is edited per edition: Telugu title, English name, tagline, colour, left and right **ears** (small boxed teasers; first line is the bold headline), a top strip, and colour-registration marks along the bottom edge.

### Layout elements

Besides stories, a page can hold **elements**, which are tiles too (drag, swap, resize and style them like stories): **photo** (image and caption), **text box**, **sidebar** (boxed, tinted text box), **label** (coloured section strip) and **ad placeholder** (hatched box with a note). Add them from the palette: click to append along the bottom, or drag onto a tile (middle = bottom of an empty slot, edge = beside it). A tile holds a story or an element, never both. Photo boxes count as flexible and soak up spare height like a hero photo.

### Editor ergonomics

- **Undo / redo** for every layout change (moves, styles, elements, masthead): Ctrl+Z, Ctrl+Y or Ctrl+Shift+Z. History is kept per edition for 50 steps and is cleared on reload.
- **Shortcuts** (not active while typing in a field): Delete takes the story out of the selected tile, Shift+Delete deletes the space, Esc deselects, G toggles guides, + and - zoom.
- **Column guides**: the six columns (cyan) and the live area (magenta) drawn over the page.

### Templates

Templates are data (`domain/layout/templates.ts`): front page (8, 5 or 3 stories), inner page (6, 4 or 2 stories) and single story. Slot **priority** decides which story goes where: the heaviest stories take priority 1. **Auto layout** picks, for each page, the fullest template whose stories still fit (fill ≤ 100%), adds pages as needed and leaves no empty tiles.

## Copyfitting

**Estimate (domain, instant):** `CopyfitEstimator` uses characters-per-line per language (measured from real renders: about 28 per column for Telugu and 24 for English at 9.5 pt) × font size × column width to predict the height a story needs. It drives the fit engine and the page-fill badge.

**Measure (presentation, exact):** after render, compare `scrollHeight` of the tile with its `clientHeight`. If larger → show a red "does not fit" bar. Later: reduce headline size one step, tighten leading, or continue the story in another tile.

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

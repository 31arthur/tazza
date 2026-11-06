# 01 · Product Requirements

## Purpose

A daily-use editor where a newsroom writes articles in Telugu and English and produces an A3 PDF of the day's newspaper.

## Users

| Role | Needs |
|---|---|
| **Reporter / writer** | Fast bilingual writing, autosave, images, word count |
| **Sub-editor** | Review, edit, change status, fit copy to space |
| **Page designer** | Place articles on A3 pages, adjust columns, headlines, photos |
| **Editor-in-chief** | Approve, see edition progress, export final PDF |

One person may hold all roles (small newsroom). Phase 1 is single-user and local; roles are a status workflow, not authentication.

## Daily workflow

```
Create edition (today) → Write articles → Review → Lay out pages → Proof → Export A3 PDF → Archive
```

1. **Open edition** for a date. Masthead, issue number and volume are auto-filled from the previous edition.
2. **Write** articles. Each has headline, sub-headline, byline, dateline, body, images, section, language.
3. **Review**: sub-editor moves articles Draft → In Review → Approved.
4. **Lay out**: approved articles are dragged onto page blocks on the A3 grid.
5. **Proof**: full-page preview identical to export output; overflow warnings shown.
6. **Export**: single multi-page PDF, plus optional per-page PDFs.
7. **Archive**: edition becomes read-only; can be duplicated as a template for tomorrow.

## Functional requirements

### Editions
- FR-E1 Create an edition per calendar date (one per date per publication).
- FR-E2 Edition status: `Open → Layout → Ready → Exported` (reopening allowed).
- FR-E3 Edition dashboard shows article counts by status and page fill.
- FR-E4 Duplicate a past edition's page structure as a starting point.

### Articles
- FR-A1 Rich-text body: paragraphs, bold, italic, underline, subheads, pull quote, bullet and numbered lists, links not required.
- FR-A2 Per-article language (`te`, `en`) and per-paragraph language override for mixed text.
- FR-A3 Headline, sub-headline, byline, dateline, section, tags.
- FR-A4 Images with caption, credit and crop; stored locally.
- FR-A5 Autosave (debounced) with visible save state.
- FR-A6 Word and character count, estimated column inches.
- FR-A7 Status workflow `Draft → In Review → Approved → Placed`.
- FR-A8 Search and filter by language, section, status, date.

### Language support
- FR-L1 Type Telugu using the OS IME or the built-in phonetic transliteration (English letters → Telugu).
- FR-L2 Correct shaping of Telugu conjuncts and vowel signs in editor, preview and PDF.
- FR-L3 Language toggle shortcut in the editor.
- FR-L4 UI available in English and Telugu.
- FR-L5 Dates shown in Telugu and English forms on the masthead.

### Layout
- FR-P1 A3 portrait pages (297 × 420 mm) with a 6-column grid.
- FR-P2 Page templates (front page, inner, editorial, sports, classifieds-style).
- FR-P3 Drag articles onto blocks; resize blocks by columns and rows.
- FR-P4 Text flows across columns inside a block; overflow indicator.
- FR-P5 Add, remove and reorder pages.
- FR-P6 Masthead on page 1, running header and folio on others.

### Export
- FR-X1 Export all pages to one PDF at exactly A3.
- FR-X2 Embedded fonts, selectable text, images at ≥ 200 dpi effective.
- FR-X3 Optional bleed (3 mm) and crop marks.
- FR-X4 Preview equals output (same render components).
- FR-X5 Export is repeatable: same data gives the same PDF.

### Data
- FR-D1 Local-first storage in IndexedDB.
- FR-D2 Export and import an edition as a single bundle file (`.tazza.json` with embedded assets).
- FR-D3 Storage backend swappable without UI changes (repository ports).

## Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | Typing latency under 50 ms on a 3,000-word article |
| NFR-2 | A 16-page edition exports in under 60 s |
| NFR-3 | Works offline after first load (PWA, Phase 3) |
| NFR-4 | No data loss on tab close or crash (autosave + recovery) |
| NFR-5 | Keyboard-accessible; WCAG AA contrast in UI |
| NFR-6 | Layer boundaries enforced by lint in CI |

## Out of scope (for now)

Multi-user real-time collaboration, authentication, CMS or website publishing, ad-booking, colour-separation (CMYK/PDF-X), OCR.

## Success criteria

A writer can produce a full day's edition in Telugu and English and export an A3 PDF that prints with correct Telugu shaping, with no manual fixing outside the app.

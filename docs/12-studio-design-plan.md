# 12 · Tazza Studio: Design Plan

A plan for turning Tazza from "an editor with a layout view" into a complete newspaper design studio: as easy to use as Canva, and built for broadsheet and tabloid production in Telugu and English.

> Assumption: "pageviewer/dreamviewer" is read here as PageMaker/InDesign-class page-layout tools, which is what Telugu newsrooms have traditionally paginated in. If you meant a different product, only section 1 changes.

## 1. Why a new tool

| Pain with classic page-layout tools | Tazza Studio answer |
|---|---|
| Steep learning curve; layout is a specialist job | Direct manipulation, templates first, instant preview (the Canva model) |
| Stories are typed or pasted into boxes, then re-fitted by hand | Stories live in the editor and are *placed*; the fit engine sizes tiles and columns |
| Indian-language text needs special setup and legacy fonts | Unicode Telugu and English mixed freely, shaped correctly, language detected per paragraph |
| Desktop install, per-seat licences, files on one PC | Runs in the browser, local-first, sync later |
| Overset text and low-res photos found at the press | Live warnings and a preflight check before export |
| No notion of an *edition* | A daily edition is the unit: date, pages, stories, masthead, status |

What Canva gets right and we copy: one canvas, everything is an object you can click, drag, resize and restyle; a contextual panel that only shows what applies; templates and brand colours; undo that never fails; export in one click.

What a newspaper needs that Canva does not have: a column grid, text that flows and fits, bilingual typography, styles, jump lines, datelines, rule weights, spot colours, bleed and crop marks, and a daily deadline workflow.

## 2. Users and jobs

| Who | Main jobs |
|---|---|
| Reporter | Write a story with photos, see roughly how long it is, submit |
| Sub-editor | Edit, fit headline and length, mark ready |
| Page designer | Choose a template, place stories, adjust, add furniture (boxes, labels, ads), proof |
| Chief editor | See edition progress, approve pages, export |
| Photo desk | Manage and crop photos, add captions and credits |

## 3. Design principles

1. **One canvas, two kinds of things.** *Tiles* (stories and elements that tile the grid and re-fit) and *free objects* (text, shapes, images placed anywhere, like Canva). Tiles are the default for body content; free objects are for overlays, stamps, arrows, cut-out photos, stickers.
2. **Preview is the document.** The editor draws pages with the same renderer as print.
3. **Mm, not pixels.** All geometry is in millimetres on an A3 page.
4. **Styles over manual formatting.** Named styles and a fixed palette, so a page stays consistent.
5. **Warn, never silently cut.** Overset text, low-res images, missing text and empty slots are always visible.
6. **Everything undoable.** Every change is a command; history is per edition.
7. **Keyboard and mouse equal citizens.** Every common action has a shortcut.

## 4. Capability map

Status: ✅ done (Phase A shipped) · ⏭ planned · 💭 later.

### Content
| Capability | Status |
|---|---|
| Rich-text story editor, images, captions, autosave | ✅ |
| Automatic Telugu/English detection, NFC | ✅ |
| Dateline, kicker, deck, byline | ✅ |
| Story status workflow (draft, review, approved) | ⏭ |
| Version history per story | ⏭ |
| Phonetic Telugu typing (English letters to Telugu) | ⏭ |
| Spell check (English now, Telugu word list later) | 💭 |

### Layout
| Capability | Status |
|---|---|
| Tiled layout tree, fit engine, auto layout | ✅ |
| Page templates (front 8/5/3, inner 6/4/2) | ✅ |
| Drag-and-drop move/swap/place, divider resize | ✅ |
| Tile styles, palette, rules, kicker, jump line, banner headline | ✅ |
| Layout elements (photo, text box, sidebar, label, ad) | ✅ |
| Undo/redo, shortcuts, column guides | ✅ |
| **Free objects layer** (text, shapes, lines, images anywhere on the page) | ✅ |
| **Smart guides and snapping** (page, margins, columns, other objects) | ✅ |
| **Align to page and columns, z-order, duplicate, lock, hide** | ✅ |
| **Layers panel** | ✅ |
| Multi-select, group, distribute, align to selection | ⏭ |
| Rulers and draggable guides | ⏭ |
| Master pages (repeat header, folio, rules per section) | ⏭ |
| Style library (save and apply a tile or object style) | ⏭ |
| Templates gallery and "save page as template" | ⏭ |
| Brand kit (palette, fonts, logo per publication) | ⏭ |
| Linked text frames: continue a story in another tile, automatic jump lines | ⏭ |
| Spreads (two-page views), page thumbnails strip | ⏭ |
| Text wrap around photos | 💭 |

### Images and assets
| Capability | Status |
|---|---|
| Upload, downscale, store locally | ✅ |
| Asset library panel (search, tags, credit, reuse across editions) | ⏭ |
| Crop with focal point, rotate, brightness/contrast, greyscale | ⏭ |
| Background removal / cut-out | 💭 |
| Shapes, lines, arrows, icons | ✅ basic shapes · ⏭ icon set |

### Output
| Capability | Status |
|---|---|
| Print preview and browser "Save as PDF" at A3 | ✅ |
| Preflight (overset, low-res photos, empty slots, missing captions, fonts) | ⏭ |
| One-click deterministic PDF (Chromium companion), bleed and crop marks | ⏭ |
| PDF/X and CMYK for the press | 💭 |
| Page PNG/JPG for social and WhatsApp, e-paper HTML | ⏭ |

### Team and platform
| Capability | Status |
|---|---|
| Local-first storage | ✅ |
| Edition export/import bundle (backup) | ⏭ |
| Accounts, roles, comments, approvals | 💭 |
| Real-time collaboration, cloud sync | 💭 |
| PWA/offline install | ⏭ |
| Desktop shell (Tauri/Electron) | 💭 |

## 5. Studio architecture

### Domain model (additions)

```
Page
 ├─ layout   : LayoutNode        tiling of stories and elements (exists)
 └─ objects  : PageObject[]      free objects, drawn above the tiles, in z-order (new)

PageObject { id, kind: text | shape | image, x, y, w, h (mm), rotation (deg),
             locked, hidden, name, ...kind-specific fields }
```

Later: `MasterPage` (repeating objects per page group), `StyleDef` (named tile/object style), `Template` (page structure + objects + style), `Group` (objects moving together), `ThreadLink` (story continues in another tile).

### Pure domain services (testable without a browser)
- `snap(rect, targets, threshold)` → snapped position plus the guide lines to draw.
- `align(objects, mode, reference)` and later `distribute`.
- `reorder(objects, id, op)` for front, back, forward, backward.
- Existing: `fit` engine, `CopyfitEstimator`, `detectLanguage`, layout tree operations.

### Use cases (one class per command; each is undoable)
`AddObject`, `UpdateObject`, `RemoveObject`, `DuplicateObject`, `ReorderObject`, `AlignObject`, and later `GroupObjects`, `SaveTemplate`, `ApplyStyle`, `LinkFrames`, `RunPreflight`.

### Presentation: studio shell

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Top bar: edition · page · undo/redo · zoom · guides · preview · export       │
├───────┬──────────────────┬───────────────────────────────────┬───────────────┤
│ Tool  │ Side panel       │ Canvas (pages, rulers, guides)    │ Inspector     │
│ rail  │ Stories          │   tiles + free objects            │ (contextual)  │
│       │ Elements         │   selection handles, smart guides │ Position/size │
│ Select│ Templates        │                                   │ Style         │
│ Text  │ Layers           │                                   │ Text          │
│ Shape │ Assets           │                                   │ Arrange/align │
│ Image │ Pages            │                                   │               │
├───────┴──────────────────┴───────────────────────────────────┴───────────────┤
│ Status bar: page fill %, warnings (overset, low-res), save state             │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Component inventory

| Component | Responsibility |
|---|---|
| `StudioShell` | Layout of the panels; owns selection and tool state |
| `ToolRail` | Select, Text, Shape, Line, Image tools |
| `Canvas` | Zoom, scroll, page frame, hit testing, pointer routing |
| `PageRenderer` (exists) | Draws a page identically for canvas, preview and print |
| `ObjectsLayer` | Draws free objects (print-safe, no editing chrome) |
| `SelectionOverlay` | Handles to resize and rotate, bounding box, size readout |
| `SmartGuides` | Draws the snap lines found by the snapping service |
| `ColumnGuides` (exists) | Columns and live area |
| `Inspector` | Shows the panel that fits the selection (tile, object, masthead, page) |
| `ObjectPanel` | Position, size, rotation, fill, stroke, text options, align, arrange |
| `StylePanel`, `ElementPanel`, `MastheadPanel` (exist) | Tile and masthead styling |
| `LayersPanel` | List of objects top-first with visibility, lock, rename, reorder |
| `ElementPalette` (exists) | Add tiles; extends to a full "Insert" panel |
| `TemplatesPanel` (planned) | Gallery of page templates |
| `PagesPanel` (planned) | Thumbnails, reorder, add, remove |
| `PreflightPanel` (planned) | List of problems with click-to-jump |

### Selection and tools model
A single `Selection` is `none | tile(id) | object(id)` (multi-select in Phase B). A `Tool` is `select | text | rect | ellipse | line | image`. Pointer events on the canvas are routed by the active tool: select mode hit-tests objects first (top z first) then tiles; creation tools draw a new object by dragging.

## 6. Delivery roadmap

Each phase is one or more branches (`feature/…`) merged back into `dev`, with tests and a browser check.

| Phase | Branch | Scope | Done when |
|---|---|---|---|
| **A ✅** | `feature/free-objects` | Free objects layer, select/move/resize/rotate, snapping and smart guides, align to page, z-order, duplicate, lock/hide, insert text/shape/line/image, object panel, layers panel | A designer can add a stamp, arrow, cut-out photo or label anywhere on the page, snap it to columns and margins, and see it identically in preview |
| B | `feature/multi-select` | Multi-select, group/ungroup, distribute, align to selection, rulers, draggable guides, marquee select | Align three boxes in two clicks |
| C | `feature/masters-and-styles` | Master pages, style library, brand kit, templates gallery, save page as template | New edition from a saved template in one click |
| D | `feature/linked-frames` | Continue a story in another tile, automatic "continued on page N" and "continued from", overset resolution | A long story flows across two pages with jump lines |
| E | `feature/image-tools` | Asset library, crop with focal point, rotate, greyscale, captions and credits | Reuse yesterday's photo, crop to a tile |
| F | `feature/preflight-export` | Preflight panel, Chromium PDF companion, bleed and crop marks, per-page PNG, edition bundle backup | One-click A3 PDF with a clean preflight |
| G | `feature/workflow` | Story status, versions, roles, comments, approvals | Reporter to editor to designer handoff |
| H | `feature/sync-and-offline` | Backend sync adapter, PWA, optional desktop shell | Two people work on one edition |

## 7. Risks and open decisions

| Risk | Mitigation |
|---|---|
| Free objects and the tiling layout fighting over the same space | Objects float above tiles and never affect fit; tiles are the structure, objects are decoration |
| Pointer interaction complexity (resize, rotate, snap) | Pure geometry and snapping in the domain with tests; thin React layer |
| Browser PDF differences | Pin Chromium, add the companion exporter in Phase F |
| Telugu shaping in free text objects | Same fonts and `lang` detection as stories; visual regression fixtures |
| Press requires CMYK / PDF/X | Out of scope until Phase F decisions with the printer |

Open questions for the newsroom: which fonts the paper's identity requires, bleed and crop-mark rules, number of pages per day, whether ads arrive as finished artwork, and whether more than one person edits at once.

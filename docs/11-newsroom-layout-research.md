# 11 · Newspaper Layout Research and Design Spec

What professional paginators and designers do, what a real Telugu front page looks like, and what Tazza therefore needs to offer. Research was done on 2026-11-07; the web sources are mostly teaching material and trade articles, so the limits of each are noted.

## 1. How the professional tools work

| Tool | What newsrooms use it for | Ideas worth borrowing |
|---|---|---|
| Adobe InDesign | Most-used page-layout tool ([G2 comparison](https://www.g2.com/compare/adobe-indesign-vs-inpage-vs-quarkxpress)) | Master pages, paragraph/object styles, linked text frames, a Story Editor to copyfit without the layout, libraries and snippets of reusable boxes |
| QuarkXPress | Long popular with newspaper and magazine paginators ([TrustRadius](https://www.trustradius.com/compare-products/adobe-indesign-vs-quarkxpress)) | Fast, grid-driven pagination, style sheets |
| Scribus | Free and open source, workable for budget papers ([Low End Mac](https://lowendmac.com/2004/scribus-another-alternative-to-quark-and-indesign/)) | Proof that a free tool can do print-ready pages |
| Pagination/newsroom suites | Place stories from the editorial system straight onto pages ([overview](https://gitnux.org/best/newspaper-production-software/)) | Stories live in one system and are *placed*, not retyped |

Practices that recur across the InDesign sources ([guide](https://newspaper-templates.com/guides/how-to-make-a-newspaper-in-indesign/), [practice guide](https://practicetestgeeks.com/adobe/adobe-indesign-newspaper), [CreativePro](https://creativepro.com/?p=11845)):

- **Master pages** hold everything that repeats (header, folio, rules), so pages stay consistent.
- **Styles, not manual formatting**: a headline, deck, byline and body are named styles applied in one click to many items.
- **Linked frames** let one story continue across non-contiguous boxes and pages; a **Story Editor** lets sub-editors copyfit text away from the layout.
- **Overset text must be visible**: a box that cannot hold its text is flagged, never silently cut.
- **Libraries/snippets** store reusable boxes (a sidebar style, a refer box).

## 2. Design principles to follow

From the [Society for News Design analysis by Hays](https://eloncdn.blob.core.windows.net/eu3/sites/153/2018/12/05-Hays.pdf), the [Journalism Today](https://highered.mheducation.com/sites/0078616166/student_view0/chapter10/overview.html) chapter and the [Poynter](https://poynter.org/?p=1452) piece on boxes:

1. **Modular grid.** Equal columns across the page; a single grid keeps every section consistent. (Tazza: 6 columns on A3.)
2. **One dominant element.** The size of the dominant image sets the entry point and the hierarchy. Most front pages carry a single main photo.
3. **Build order.** Place the lead story, then the dominant photo or graphic, then fit everything else around them. Keep the dominant element off the exact centre line.
4. **Hierarchy by size, weight and position**, not by decoration. Smaller type and quieter positions for lesser stories.
5. **Boxes and tints have a purpose.** Decide in advance which story types get a box, and keep one consistent style for each (Poynter).
6. **A small set of rule weights**, used consistently (one example guide uses two weights in a 1:4 ratio, [Kessel](https://brand.kessel.com/guides/print/designelemente/?lang=en)).
7. **Spot colour for emphasis only**: logo, section labels, key graphics ([Fiveable](https://fiveable.me/editorial-design/unit-8/newspaper-layout-fundamentals/study-guide/ObFtrRuiCVJvMFt8)); name a printer-matchable reference rather than a screen hex.
8. **Vocabulary the tool must understand:** kicker (small label above a headline), hammer head (short, heavy headline), deck (sub-headline), jump line (where a story continues), refer box (teaser pointing to another page), sidebar (companion piece).

Telugu specifics ([Indian Printer & Publisher](https://indianprinterpublisher.com/?p=79647), [Indian Type Foundry on Prajavani](https://www.indiantypefoundry.com/customfonts/prajavani)): Indian-language papers have historically had few strong headline typefaces, and good papers commission a distinct display face with a matching text family. Free Unicode options worth offering include Noto Serif/Sans Telugu, Ramabhadra and NTR (verify licences on Google Fonts before bundling).

Not verified: the "20–30% white space" figure that circulates in teaching guides had no primary source; a busy Indian broadsheet front page uses far less.

## 3. Anatomy of the reference page (Vaartha front page)

Observed from the reference image supplied by the user:

| Area | What it does |
|---|---|
| **Top strip** | Tiny line of publication/printing-centre text across the top edge; edition and date box with QR code at top right |
| **Masthead** | Large centred logo in brand blue with a small swoosh; **ears** (small boxes) on each side hold teasers: left a photo teaser with a coloured kicker, right a row of head-shots with headlines. A heavy rule sits under the masthead |
| **Banner** | Full-width dominant photo with a **huge headline printed over the picture** (white letters with dark outline), then a **yellow deck band** with red text. Teaser/refer boxes flank it |
| **Colour coding** | Black ink for most headlines; **red for the most urgent** headlines and decks; blue for secondary labels; pale **tints** (yellow/green for markets, pink, light blue) behind sidebars and boxes; red or blue thin outlines around boxed stories |
| **Rules** | Thin black rules between stacked stories; hairline vertical column rules; heavy rule under the masthead; coloured outlines on boxes |
| **Story anatomy** | Kicker label → big headline → coloured deck → byline → text with a **bold coloured place name run-in** at the start (dateline) → small **jump marker "2 >>"** in a box where a story continues |
| **Photos** | Many photos of different sizes; the lead photo spans 4–5 columns; thin border; small italic caption |
| **Lower page** | Stories in 2–4 column modules, one or two photo-led stories along the bottom with a coloured headline strip |
| **Footer** | Colour-registration strip (small CMYK dots/bars) and folio line along the bottom edge |
| **Headline scale (approx.)** | Banner 60 pt+, lead 36–40 pt, secondary 22–28 pt, boxes/briefs 13–18 pt, decks 11–14 pt |

## 4. What Tazza needs (requirements derived from the above)

### A. Style system (like InDesign styles)
- Named **tile styles** (presets): Banner, Lead, Story, Boxed/tinted, Brief, Teaser. Each bundles headline size, headline font, headline colour, deck colour, background tint, frame (rule/box), and rule weights.
- Per-tile **overrides**: accent colour, tint, frame, kicker, jump line, headline over photo.
- A small **palette** of named colours (ink, red, blue, green, amber, and their tints) so colour is coded, not freehand.
- Fixed **rule weights**: hairline 0.2 mm, standard 0.3 mm, heavy 0.8 mm.
- **Dateline run-in** at the start of a story.
- **Masthead editor**: logo text, English name, colour, tagline, left/right ear text, top strip text, QR/edition box; page-1 only, plus a running header for inner pages.
- **Print marks**: colour-registration strip and folio line.

### B. Layout elements (beyond stories)
Photo box with caption, free text box, tinted sidebar/refer box, section label strip, and an ad placeholder. Elements are tiles: they can be dragged, resized, swapped and styled exactly like stories.

### C. Editor ergonomics
Undo/redo (essential in layout work), keyboard shortcuts (Delete, Esc, Ctrl+Z/Y), column-grid guides, overset warnings (already present), and a page-fill indicator (already present).

### Later
Linked text frames (continue a story in another tile with automatic jump lines), master pages, libraries of saved boxes, spot-colour/CMYK PDF output, a Story Editor view for copyfitting, ad booking.

## 5. Delivery plan (branches)

| Branch | Scope |
|---|---|
| `docs/newsroom-design-research` | This document |
| `feature/style-system` | Tile styles, palette, rules, kicker, jump line, dateline, headline over photo, masthead editor, print marks |
| `feature/layout-elements` | Photo, text, sidebar, label and ad-placeholder elements |
| `feature/editor-ergonomics` | Undo/redo, shortcuts, column guides |

Each branch is committed, pushed, then merged back into the default branch (`dev`) and pushed again.

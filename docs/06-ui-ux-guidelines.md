# 06 · UI / UX Guidelines

## Screens

| Route | Screen | Purpose |
|---|---|---|
| `/` | Edition dashboard | Today's edition, progress, recent editions, create/duplicate |
| `/editions/:id/articles` | Article desk | Table/board of articles, filters by status, language, section |
| `/editions/:id/articles/:articleId` | Article editor | Metadata sidebar + rich-text editor + live copyfit |
| `/editions/:id/layout` | Layout canvas | Page thumbnails, A3 canvas, article palette |
| `/editions/:id/preview` | Proof preview | Read-only, exactly as exported |
| `/print/:editionId` | Print route | Chrome-less pages for PDF (not linked in nav) |
| `/settings` | Settings | Fonts, grid, masthead, language, phonetic rules |

## Layout of the app shell

```
┌──────────────────────────────────────────────────────────────┐
│ Tazza · Edition 6 Nov 2026 · Open        [తె|EN]  [Export ▾]  │
├──────────┬───────────────────────────────────────────────────┤
│ Desk     │                                                   │
│ Layout   │                 Route content                     │
│ Preview  │                                                   │
│ Settings │                                                   │
└──────────┴───────────────────────────────────────────────────┘
```

Editor screen: left = article metadata (section, language, status, images); centre = writing surface; right (collapsible) = copyfit and checks.
Layout screen: left = approved/unplaced articles; centre = A3 canvas; bottom = page strip; right = block properties.

## shadcn/ui usage

- Install components on demand with the CLI into `presentation/components/ui/`. Treat them as owned source: edit freely, but keep them domain-agnostic.
- Used: `button`, `input`, `textarea`, `select`, `tabs`, `dialog`, `sheet`, `dropdown-menu`, `command` (search/palette), `badge`, `tooltip`, `toggle-group`, `scroll-area`, `resizable`, `sonner` (toasts), `table`, `progress`.
- Feature components compose primitives; no business logic in `components/ui`.
- Theme via CSS variables (light and dark). **Page canvas and preview are always light** (paper white) regardless of app theme.

## Framer Motion rules

Motion should explain change, not decorate.

| Use | Animation |
|---|---|
| Route transitions | 150 ms fade + 8 px slide via `AnimatePresence` |
| Panels/sheets | spring (stiffness 300, damping 30) |
| Article cards reorder | `layout` prop / `Reorder.Group` |
| Placing an article on a block | block outline pulse (200 ms) and the card flies to the block with `layoutId` |
| Status change | badge colour cross-fade |
| Save indicator | opacity swap, no movement |

Rules:
- Honour `prefers-reduced-motion` with `useReducedMotion()`: replace movement with fades.
- Never animate inside the typing surface or the exported print route.
- Animate `transform`/`opacity` only; no layout-thrashing properties.
- Shared durations/springs live in `presentation/styles/motion.ts`.

## Layout canvas interaction

- Zoom: fit-width default; `Ctrl+scroll` or slider 25–200 %.
- Drag from palette to a block, or draw a new block on the grid; snap to columns and 10 mm rows.
- Resize handles on block edges; live column-count and overflow feedback.
- Guides: column grid, margins, bleed; toggle with `G`.
- Keyboard: arrow keys nudge by one module; `Delete` clears block; `Ctrl+D` duplicates block.
- Drag and drop uses dnd-kit with accessible keyboard sensors.

## Visual design

- UI font: Inter + Noto Sans Telugu. Newsprint content uses serif faces ([04](04-editor-and-language-support.md)).
- Telugu text is slightly larger than Latin at the same nominal size (UI scale factor 1.05) for legibility.
- Status colours: Draft grey, In Review amber, Approved green, Placed blue, Overflow red. Always paired with an icon or text (not colour alone).
- Density: comfortable default; compact mode for the article table.

## Accessibility

- All controls keyboard reachable; focus ring visible.
- ARIA labels in both languages from i18n.
- Contrast AA in both themes.
- The editor sets `lang` attributes so screen readers switch pronunciation.

## Empty, loading and error states

Every list/screen defines all three: skeleton while loading, helpful empty state with the primary action ("Create today's edition"), and an error card with retry. Destructive actions (delete article, clear page) use a confirm dialog with undo toast where possible.

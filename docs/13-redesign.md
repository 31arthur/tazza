# 13. The redesign: one desk, three roles, four steps

Every feature from phases A to H stayed. What changed is how they are presented, so the screens ask less of the person using them.

## Principles

1. **One job per screen.** Writing, reviewing, arranging and publishing each have their own screen. Rarely used controls sit in menus and collapsible sections.
2. **The day is a workflow.** A four-step rail (Write, Review, Arrange, Publish) sits under the top bar on every screen. Each step shows what is left ("9 drafts left", "3 stories to place") and links to the screen that needs attention.
3. **Roles decide what you see.** After a mock sign-in the app shows only the screens your role uses.
4. **Suggest, never impose.** Design help appears as suggestions with a button. Nothing changes until it is pressed, and Undo takes it back.

## Roles

| Role | Starts at | Can open |
|---|---|---|
| **Author** (domain `reporter`) | Write | Write, Photos, Publish |
| **Editor** | Newsroom | everything |
| **Designer** | Studio | Newsroom (to see status), Studio, Publish, Photos, Templates |

Access is a domain rule (`canOpen`, `landingFor` in `Workflow.ts`), enforced by the shell, which redirects a role away from a screen it does not use. The sign-in is a **demo**: a name and a role kept on this computer, no password. Switch role from the account menu at the top right.

## Screens

- **Home** (`/`): a long landing page: what Tazza is, the four-step day, the three roles, the smart help, and the sign-in card. Signed-in users see "Welcome back" and an "Open my desk" button.
- **Write** (`/write`): a quiet list of stories and a single sheet of paper (headline, deck, dateline and byline, then the text, with the formatting bar pinned to the sheet). Beside it the **Story coach** shows the status, one clear next step ("Submit for review"), a six-point checklist with progress, reading time, and comments and versions behind one button. **Focus** hides everything but the page.
- **Newsroom** (`/newsroom`): a board of Draft, In review and Approved columns. Each card shows words, section, open comments and page, with the next move as a button (submit, approve, send back with a reason, reopen).
- **Studio** (`/layout`): the page canvas with a slim toolbar: pages, undo and redo, **Suggestions**, **Add** (story boxes, photos, text, shapes), **Page tools** (auto layout, fit page, templates, masters). The left tray holds only the stories waiting for a page. The right inspector shows what is selected; masthead and layers are collapsed until wanted.
- **Publish** (`/preview`): the pages as they will print, and one panel: the preflight checks run automatically, then PDF (primary), page images, the print dialog, and backup.

## The inspector

What is selected decides what the right panel shows, and only the common controls are open.

- **A story tile:** its name, the ink and tint swatches, and the tile kind (banner, lead, story...). Everything else is a closed section: *More style options* (headline colour, frame, font, kicker, jump line, reset), *Saved styles*, *Continue story* (opens by itself when the story already continues), and *Move or remove*. A photo or text box shows its content fields first.
- **A free object:** its name and the controls for what it is (text, shape or image); *Position, size and order* (position, alignment, arrangement) is one closed section. Duplicate and Delete stay at the bottom.
- **Nothing selected:** a one-line hint, with *Masthead* and *Layers* closed.

## Suggestions

`designAdvisor.ts` is a pure function that reads the page and the stories and returns suggestions, each with an optional action:

- **Colour by section.** A story's section (sports, politics, business, weather, crime, tech, culture) is judged from words in its headline and opening text, in English and Telugu. The suggestion sets the accent, tint and a kicker in the story's own language. One click colour-codes every tile that has no kicker yet, as a single undo step (`SetSlotStyles`).
- **Spacing.** A page over 102% full or under 70% full suggests re-fitting, which shares the space again; stories waiting for a page suggest automatic placement.
- **Balance and content.** Two stories set as the lead, a lead headline over 90 characters, and a page of three or more stories with no picture each produce advice with nothing to apply.

The advice is plain rules, not a language model. That is deliberate: it works offline, costs nothing, never sends a story anywhere, and gives the same answer twice. Because the Studio talks only to `advisePage`, a model-backed adviser could be swapped in later behind the same function, with an API key kept on a server and an explicit "send this story for suggestions" action.

## What is not here yet

- The demo sign-in has no passwords or accounts; anyone can pick any role.
- Colour suggestions know the seven sections above; other sections get no suggestion.

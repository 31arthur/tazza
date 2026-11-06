# 04 · Editor and Language Support

## Editor choice: TipTap

TipTap (on ProseMirror) gives structured documents, custom nodes, schema control and works with the browser's native `contenteditable`, so OS-level Telugu IMEs (Windows Telugu keyboard, Google Indic Keyboard, macOS Telugu) work without special handling.

TipTap lives **only** in `presentation/features/articles/editor/`. The domain stores `ArticleBody`, not TipTap JSON ([03-domain-model.md](03-domain-model.md)); a mapper converts between them.

### Schema (extensions)

| Node / mark | Purpose |
|---|---|
| paragraph | body text; `lang` is a decoration computed from the text, not stored |
| subhead | in-article heading |
| pullquote | emphasised quote |
| bulletList / orderedList | lists |
| bold, italic, underline | marks |
| image (block) | placed from asset library with caption/credit |

No headings H1-H6 or free-form HTML: the newspaper style sheet decides appearance. Pasted content is sanitised to this schema (strips fonts, sizes, colours).

### Toolbar and shortcuts

- Language is automatic: each paragraph is tagged `lang="te"` or `"en"` from its script. There is no language toggle.
- Phonetic mode toggle: `Ctrl+Space` (see below).
- Standard: `Ctrl+B/I/U`, `Ctrl+Z/Y`, `Ctrl+S` (forces save).
- Live word count, character count and estimated column inches in the footer.

### Autosave

`useAutosave` debounces (800 ms) and calls `UpdateArticle`. The UI shows `Saving… / Saved 10:42 / Error — retry`. On `beforeunload` a synchronous flush is attempted; a recovery copy is kept in `localStorage` keyed by article ID and reconciled on next open.

## Telugu support

### 1. Text encoding
- Unicode only, **NFC-normalised** on save (`text.normalize('NFC')`).
- Never strip ZWJ (U+200D) or ZWNJ (U+200C); they control conjunct formation.
- Do not use legacy ASCII-hacked fonts (Anu, Godavari, etc.). If incoming text uses them, provide an import converter later (out of scope for v1).

### 2. Input methods

| Method | How |
|---|---|
| OS IME | Works natively in the editor |
| Built-in phonetic mode | Type English letters (`namaskaram`) → Telugu (`నమస్కారం`) via the `Transliterator` port |
| Paste | Plain or rich paste, sanitised, NFC-normalised |

Phonetic mode is an optional adapter (`PhoneticTeluguTransliterator` in `data/services`). It is implemented as a TipTap extension that accumulates Latin keystrokes into a buffer, shows a small suggestion popover, and commits on space or punctuation. `Backspace` reverts to Latin. The rules table (ITRANS/Baraha style) lives in the adapter as data, not code, so mappings can be tuned.

### 3. Fonts

Self-hosted (no CDN) so they work offline and embed in the PDF.

| Use | Telugu | Latin |
|---|---|---|
| Body | Noto Serif Telugu | Source Serif 4 |
| Headlines | Noto Serif Telugu (bold) or Ramabhadra | Playfair Display |
| UI and captions | Noto Sans Telugu | Inter |

Candidates for character: Mandali, Gidugu, Ponnala, Suranna, Ramabhadra. All are OFL/open fonts; verify licence before bundling.

CSS font stacks list the Latin font first and the Telugu font second so mixed text picks the right face per glyph:

```css
:root {
  --font-body:  'Source Serif 4', 'Noto Serif Telugu', serif;
  --font-head:  'Playfair Display', 'Noto Serif Telugu', serif;
}
[lang='te'] { font-family: 'Noto Serif Telugu', 'Source Serif 4', serif; line-height: 1.6; }
[lang='en'] { line-height: 1.4; }
```

Telugu needs more line height than Latin because of tall vowel signs and below-base conjuncts. Each language has its own line-height token.

### 4. Typography rules
- No `hyphens: auto` for Telugu (no dictionary support); words wrap at spaces only.
- `text-align: justify` is allowed; add `text-justify: inter-word`. Check for rivers in narrow columns; allow per-block override to left-align.
- `font-feature-settings` left default so GSUB shaping (`akhn`, `rphf`, `blwf`, `pstf`) stays on.
- Digits: Latin digits by default; optional Telugu digits (౦-౯) setting per edition.
- Telugu sentence ends with `.`; danda is not used. Quotation marks follow the publication style setting.

### 5. Mixed-language content
- Each paragraph is classified automatically (Telugu when at least a third of its letters are Telugu). No manual override in v1.
- Rendering sets `lang="te"` / `lang="en"` on the element so fonts, line-height and screen readers behave correctly.
- Headline language can differ from body language.

### 6. UI localisation
- `i18next` with `en.json` and `te.json`; keys are required in both (CI check script fails on a missing key).
- Dates and numbers via `Intl.DateTimeFormat('te-IN')` / `('en-IN')`.
- Language switcher in the app header; choice persisted in `localStorage`.

### 7. Search and sorting
- Search normalises to NFC and case-folds Latin. Telugu has no case.
- Sorting uses `Intl.Collator('te')` for Telugu titles.

### 8. Spellcheck
Browser spellcheck does not cover Telugu well. v1: spellcheck on for English, off for Telugu. Roadmap: a word-list based checker behind a `SpellChecker` port.

## Known risks

| Risk | Mitigation |
|---|---|
| Browser mis-shapes a conjunct in some font | Test fixture of tricky strings ([08-testing-strategy.md](08-testing-strategy.md)); pick font with proven shaping |
| IME composition events conflict with the phonetic extension | Phonetic mode disabled while `isComposing` is true |
| Copy-paste from legacy-font sources yields garbage | Detect Private Use Area code points and warn |

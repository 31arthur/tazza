import { inlineText, type ArticleBody, type BodyNode, type Inline } from '../entities/Article';
import type { Edition } from '../entities/Edition';
import {
  CONTINUED_HEAD_MM,
  JUMP_LINE_MM,
  VERTICAL_PAD_MM,
  bodyLineMetrics,
  estimateHeaderMm,
} from '../services/CopyfitEstimator';
import { COLUMN_WIDTH_MM } from '../services/PageGeometry';
import type { ArticleLookup } from './fit';
import { layoutRects, type Leaf, type PlacedLeaf } from './tree';

/**
 * What one tile of a continued story shows. Stories are never cut in storage: the text is
 * divided across the chain of tiles at display time, from each tile's real size, so editing
 * or resizing a tile re-flows the story.
 */
export interface FlowSlice {
  readonly body: ArticleBody;
  /** The first tile carries the headline, deck, byline and photo. */
  readonly first: boolean;
  /** The last tile takes whatever text is left. */
  readonly last: boolean;
  /** Page number to print in "continued from page N". */
  readonly continuedFromPage?: number;
  /** Page number to print in "continues on page N". */
  readonly continuedToPage?: number;
  /** The tile claims to continue a story but its source is gone: draw it empty. */
  readonly orphan?: boolean;
}

interface PlacedTile extends PlacedLeaf {
  readonly pageNumber: number;
}

/** Share of a tile's column-height actually usable by text (columns never balance perfectly). */
const FILL = 0.83;
const PARAGRAPH_GAP_MM = 1.2;
/** Do not leave or carry a sliver: both halves of a split paragraph must be this long. */
const MIN_PART_CHARS = 40;

/* ---------- Splitting text ---------- */

/** Splits runs of text at a character offset, keeping bold/italic/underline on both sides. */
export const splitInlines = (
  children: readonly Inline[],
  offset: number,
): [Inline[], Inline[]] => {
  const before: Inline[] = [];
  const after: Inline[] = [];
  let seen = 0;
  for (const run of children) {
    const end = seen + run.text.length;
    if (end <= offset) before.push(run);
    else if (seen >= offset) after.push(run);
    else {
      const cut = offset - seen;
      before.push({ ...run, text: run.text.slice(0, cut) });
      after.push({ ...run, text: run.text.slice(cut) });
    }
    seen = end;
  }
  // Break at a space: it should end neither the first part nor start the second.
  const trimEnd = (runs: Inline[]) => {
    const last = runs[runs.length - 1];
    if (last) runs[runs.length - 1] = { ...last, text: last.text.trimEnd() };
    return runs;
  };
  const trimStart = (runs: Inline[]) => {
    const first = runs[0];
    if (first) runs[0] = { ...first, text: first.text.trimStart() };
    return runs;
  };
  return [trimEnd(before), trimStart(after)];
};

/** Estimated height of one body node across a single column. */
const nodeMm = (node: BodyNode, role: Leaf['role']): number => {
  const textMm = (text: string, factor = 1): number => {
    const { charsPerLine, lineMm } = bodyLineMetrics(text, role);
    return Math.ceil(text.length / (charsPerLine * factor)) * lineMm;
  };
  switch (node.type) {
    case 'paragraph':
      return textMm(inlineText(node.children)) + PARAGRAPH_GAP_MM;
    case 'subhead':
      return textMm(inlineText(node.children), 0.8) * 1.2 + 3;
    case 'pullquote':
      return textMm(inlineText(node.children), 0.7) * 1.3 + 5;
    case 'list':
      return node.items.reduce((sum, item) => sum + textMm(inlineText(item)) + PARAGRAPH_GAP_MM, 0);
    case 'image':
      return COLUMN_WIDTH_MM * 0.66 + 12;
  }
};

/** Chooses where to break a paragraph: the last space that fits, never leaving slivers. */
const breakPoint = (text: string, maxChars: number): number | undefined => {
  if (maxChars < MIN_PART_CHARS || text.length - maxChars < MIN_PART_CHARS) return undefined;
  const at = text.lastIndexOf(' ', maxChars);
  return at >= MIN_PART_CHARS ? at : undefined;
};

/**
 * Pours a story's body into tiles in order. Every tile but the last takes as much as fits (a
 * long paragraph may be split between two tiles); the last takes the rest.
 */
export const splitBody = (
  body: ArticleBody,
  capacitiesMm: readonly number[],
  role: Leaf['role'],
): BodyNode[][] => {
  const heroIndex = body.findIndex((n) => n.type === 'image');
  const hero = heroIndex >= 0 ? body[heroIndex] : undefined;
  const queue: BodyNode[] = body.filter((_, i) => i !== heroIndex);
  const slices: BodyNode[][] = capacitiesMm.map(() => []);
  if (hero) slices[0]?.unshift(hero);

  capacitiesMm.forEach((capacity, ti) => {
    const last = ti === capacitiesMm.length - 1;
    const slice = slices[ti];
    if (!slice) return;
    let used = 0;

    while (queue.length > 0) {
      const node = queue[0];
      if (!node) break;
      const cost = nodeMm(node, role);
      if (last || used + cost <= capacity) {
        slice.push(node);
        queue.shift();
        used += cost;
        continue;
      }
      if (node.type === 'paragraph') {
        const text = inlineText(node.children);
        const { charsPerLine, lineMm } = bodyLineMetrics(text, role);
        const lines = Math.floor((capacity - used - PARAGRAPH_GAP_MM) / lineMm);
        const at = lines >= 2 ? breakPoint(text, lines * charsPerLine) : undefined;
        if (at !== undefined) {
          const [head, tail] = splitInlines(node.children, at);
          slice.push({ type: 'paragraph', children: head });
          queue[0] = { type: 'paragraph', children: tail };
        }
      }
      break;
    }
  });
  return slices;
};

/* ---------- Chains of tiles ---------- */

/**
 * Works out what every tile of every continued story shows. Tiles that are not part of a chain
 * are absent from the result and draw their whole story as usual.
 */
export function flowSlices(edition: Edition, lookup: ArticleLookup): Map<string, FlowSlice> {
  const tiles = new Map<string, PlacedTile>();
  for (const page of edition.pages) {
    for (const placed of layoutRects(page.layout, page.number).leaves) {
      tiles.set(placed.leaf.id, { ...placed, pageNumber: page.number });
    }
  }

  const result = new Map<string, FlowSlice>();
  const next = new Map<string, string>();
  for (const tile of tiles.values()) {
    const from = tile.leaf.continuesFrom;
    if (from === undefined) continue;
    const source = tiles.get(from);
    const valid =
      source !== undefined &&
      tile.leaf.articleId !== undefined &&
      source.leaf.articleId === tile.leaf.articleId &&
      !next.has(from);
    if (valid) next.set(from, tile.leaf.id);
    else result.set(tile.leaf.id, { body: [], first: false, last: true, orphan: true });
  }

  const followers = new Set(next.values());
  for (const startId of next.keys()) {
    if (followers.has(startId)) continue; // not the start of a chain
    const chain: PlacedTile[] = [];
    for (let id: string | undefined = startId; id !== undefined; id = next.get(id)) {
      const tile = tiles.get(id);
      if (!tile || chain.includes(tile)) break; // a missing tile or a loop ends the chain
      chain.push(tile);
    }
    const head = chain[0];
    const article = head?.leaf.articleId ? lookup(head.leaf.articleId) : undefined;
    if (!head || !article || chain.length < 2) continue;

    const capacities = chain.map((tile, i) => {
      const hasNext = i < chain.length - 1;
      const fixed =
        i === 0
          ? estimateHeaderMm(article, tile.cols, tile.leaf)
          : VERTICAL_PAD_MM + CONTINUED_HEAD_MM;
      const free = tile.rect.h - fixed - (hasNext ? JUMP_LINE_MM : 0);
      return Math.max(0, free) * tile.cols * FILL;
    });
    const parts = splitBody(article.body, capacities, head.leaf.role);

    chain.forEach((tile, i) => {
      const prev = chain[i - 1];
      const following = chain[i + 1];
      result.set(tile.leaf.id, {
        body: parts[i] ?? [],
        first: i === 0,
        last: i === chain.length - 1,
        ...(prev && { continuedFromPage: prev.pageNumber }),
        ...(following && { continuedToPage: following.pageNumber }),
      });
    });
  }
  return result;
}

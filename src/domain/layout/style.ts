import type { Leaf, SlotRole } from './tree';

/**
 * Colour is coded, not freehand: a small palette of named inks and tints, as in a newsroom
 * style guide. Names map to print references; hex values are for the screen preview.
 */
export const PALETTE = {
  ink: '#111111',
  red: '#c8102e',
  blue: '#1d4ed8',
  green: '#15803d',
  amber: '#b45309',
} as const;
export type AccentName = keyof typeof PALETTE;
export const ACCENT_NAMES = Object.keys(PALETTE) as AccentName[];

export const TINTS = {
  yellow: '#fff3bf',
  blue: '#e3eeff',
  pink: '#ffe3e6',
  green: '#e1f5e6',
  grey: '#efefef',
} as const;
export type TintName = keyof typeof TINTS | 'none';
export const TINT_NAMES: TintName[] = ['none', 'yellow', 'blue', 'pink', 'green', 'grey'];

/** Rule weights in mm: hairline between columns, standard between stories, heavy under banners. */
export const RULE_MM = { hairline: 0.2, standard: 0.3, heavy: 0.8 } as const;

export type FrameName = 'rule' | 'box' | 'none';
export type HeadlineFont = 'serif' | 'sans' | 'display';

export interface LeafStyle {
  /** Colour of kicker, deck, box outline and jump line. */
  readonly accent: AccentName;
  /** Headline in black ink or in the accent colour (red for the most urgent stories). */
  readonly headlineColor: 'ink' | 'accent';
  readonly tint: TintName;
  readonly frame: FrameName;
  readonly headlineFont: HeadlineFont;
  /** Small label above the headline. */
  readonly kicker: string;
  /** Where the story continues, e.g. "2 >>". */
  readonly jump: string;
  /** Headline printed over the lead photo (banner style). */
  readonly headlineOverPhoto: boolean;
  /** Deck set on a yellow band with accent-coloured text. */
  readonly deckBand: boolean;
}

const base: LeafStyle = {
  accent: 'blue',
  headlineColor: 'ink',
  tint: 'none',
  frame: 'rule',
  headlineFont: 'serif',
  kicker: '',
  jump: '',
  headlineOverPhoto: false,
  deckBand: false,
};

/** The style each role starts with. A tile may override any field. */
export const ROLE_PRESETS: Record<SlotRole, LeafStyle> = {
  banner: {
    ...base,
    accent: 'red',
    headlineFont: 'display',
    headlineOverPhoto: true,
    deckBand: true,
  },
  lead: { ...base, accent: 'red', headlineFont: 'display' },
  story: base,
  box: { ...base, tint: 'blue', frame: 'box' },
  brief: base,
  teaser: {
    ...base,
    accent: 'red',
    headlineColor: 'accent',
    headlineFont: 'sans',
    tint: 'yellow',
    frame: 'box',
  },
};

export const resolveStyle = (leaf: Pick<Leaf, 'role' | 'style'>): LeafStyle => ({
  ...ROLE_PRESETS[leaf.role],
  ...leaf.style,
});

/* ---------- Masthead ---------- */

export interface Masthead {
  readonly title: string;
  readonly titleEn: string;
  readonly tagline: string;
  readonly color: AccentName;
  /** Small boxes beside the logo; the first line is a bold headline. */
  readonly leftEar: string;
  readonly rightEar: string;
  /** Tiny line along the very top edge (printing centres, website). */
  readonly topStrip: string;
  /** Colour-registration marks along the bottom edge. */
  readonly printMarks: boolean;
}

export const DEFAULT_MASTHEAD: Masthead = {
  title: 'తాజా',
  titleEn: 'TAZZA',
  tagline: 'ప్రతి రోజు తాజా వార్తలు',
  color: 'blue',
  leftEar: '',
  rightEar: '',
  topStrip: '',
  printMarks: true,
};

export const resolveMasthead = (saved: Partial<Masthead> | undefined): Masthead => ({
  ...DEFAULT_MASTHEAD,
  ...saved,
});

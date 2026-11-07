import type { Article } from '../entities/Article';
import { bodyParagraphs } from '../entities/Article';
import type { AccentName, LeafStyle, TintName } from '../layout/style';
import { leavesOf, type LayoutNode } from '../layout/tree';
import { detectLanguage } from './detectLanguage';

/**
 * Design suggestions for a page, from rules a newsroom designer would apply by eye: colour-code
 * sections, notice a page that is too full or too empty, flag two stories competing for the lead.
 * Pure and deterministic. It sits behind a plain function so a smarter adviser (for example one
 * backed by a language model) could replace it without touching the screens.
 */

export type SectionName = 'sports' | 'politics' | 'business' | 'weather' | 'crime' | 'tech' | 'culture';

interface SectionDef {
  readonly accent: AccentName;
  readonly tint: TintName;
  readonly kicker: { readonly en: string; readonly te: string };
  readonly words: readonly string[];
}

/** Words that give a section away, in English and Telugu (matched as parts of words). */
export const SECTIONS: Readonly<Record<SectionName, SectionDef>> = {
  sports: {
    accent: 'blue',
    tint: 'none',
    kicker: { en: 'SPORTS', te: 'క్రీడలు' },
    words: ['cricket', 'match', 'tournament', 'league', 'football', 'olympic', 'క్రికెట్', 'క్రీడ', 'మ్యాచ్', 'టోర్నీ'],
  },
  politics: {
    accent: 'red',
    tint: 'none',
    kicker: { en: 'POLITICS', te: 'రాజకీయం' },
    words: ['election', 'minister', 'assembly', 'party', 'chief minister', 'rally', 'ఎన్నిక', 'మంత్రి', 'అసెంబ్లీ', 'పార్టీ', 'ముఖ్యమంత్రి'],
  },
  business: {
    accent: 'green',
    tint: 'none',
    kicker: { en: 'BUSINESS', te: 'వ్యాపారం' },
    words: ['sensex', 'market', 'rupee', 'budget', 'economy', 'bank', 'shares', 'సెన్సెక్స్', 'మార్కెట్', 'రూపాయి', 'బడ్జెట్', 'బ్యాంకు', 'ఆర్థిక'],
  },
  weather: {
    accent: 'blue',
    tint: 'blue',
    kicker: { en: 'WEATHER', te: 'వాతావరణం' },
    words: ['rain', 'monsoon', 'cyclone', 'flood', 'heatwave', 'weather', 'వర్ష', 'వాన', 'తుపాను', 'వరద', 'ఎండ'],
  },
  crime: {
    accent: 'ink',
    tint: 'none',
    kicker: { en: 'CRIME', te: 'నేరాలు' },
    words: ['police', 'arrest', 'murder', 'theft', 'court', 'accident', 'పోలీస్', 'అరెస్ట్', 'హత్య', 'దొంగతనం', 'కోర్టు', 'ప్రమాదం'],
  },
  tech: {
    accent: 'amber',
    tint: 'none',
    kicker: { en: 'TECH', te: 'టెక్' },
    words: ['digital', 'internet', 'software', 'smartphone', 'ai ', 'technology', 'డిజిటల్', 'ఇంటర్నెట్', 'సాంకేతిక', 'స్మార్ట్'],
  },
  culture: {
    accent: 'amber',
    tint: 'yellow',
    kicker: { en: 'CULTURE', te: 'సంస్కృతి' },
    words: ['festival', 'film', 'cinema', 'temple', 'sankranti', 'music', 'పండుగ', 'సినిమా', 'దేవాలయం', 'సంక్రాంతి', 'సంగీతం'],
  },
};

/** The section a story belongs to, judged from its headline (counted double) and opening text. */
export const detectSection = (article: Article): SectionName | undefined => {
  const head = `${article.headline} ${article.subHeadline}`.toLowerCase();
  const body = bodyParagraphs(article.body).join(' ').slice(0, 400).toLowerCase();
  let best: { name: SectionName; score: number } | undefined;
  for (const [name, def] of Object.entries(SECTIONS) as [SectionName, SectionDef][]) {
    const score = def.words.reduce(
      (sum, w) => sum + (head.includes(w) ? 2 : 0) + (body.includes(w) ? 1 : 0),
      0,
    );
    if (score > 0 && (!best || score > best.score)) best = { name, score };
  }
  return best?.name;
};

/** The style that colour-codes a story for its section; the kicker is set in the story's language. */
export const sectionStyle = (article: Article, section: SectionName): Partial<LeafStyle> => {
  const def = SECTIONS[section];
  const lang = detectLanguage(article.headline) === 'te' ? 'te' : 'en';
  return { accent: def.accent, tint: def.tint, kicker: def.kicker[lang] };
};

export type SuggestionKind = 'colour' | 'spacing' | 'balance' | 'content';

export type SuggestionAction =
  | { readonly type: 'styles'; readonly patches: readonly { leafId: string; style: Partial<LeafStyle> }[] }
  | { readonly type: 'fit' }
  | { readonly type: 'autoLayout' };

export interface Suggestion {
  readonly id: string;
  readonly kind: SuggestionKind;
  /** Locale key under `advisor.messages` and the values for it. */
  readonly message: string;
  readonly params?: Readonly<Record<string, string | number>>;
  /** What pressing the button does; absent for advice with nothing to apply. */
  readonly action?: SuggestionAction;
}

export interface AdviceInput {
  readonly layout: LayoutNode;
  readonly articles: ReadonlyMap<string, Article>;
  /** How full the page is (1 = exactly full), from the fit engine. */
  readonly fill: number;
  /** Approved or any stories not yet on any page. */
  readonly unplacedCount: number;
}

const TOO_EMPTY = 0.7;
const TOO_FULL = 1.02;
const LONG_LEAD_HEADLINE = 90;

export const advisePage = ({ layout, articles, fill, unplacedCount }: AdviceInput): Suggestion[] => {
  const out: Suggestion[] = [];
  const leaves = leavesOf(layout);
  const placed = leaves.flatMap((leaf) => {
    const article = leaf.articleId ? articles.get(leaf.articleId) : undefined;
    return article && !leaf.continuesFrom ? [{ leaf, article }] : [];
  });

  if (unplacedCount > 0) {
    out.push({ id: 'unplaced', kind: 'spacing', message: 'unplaced', params: { count: unplacedCount }, action: { type: 'autoLayout' } });
  }

  if (placed.length > 0 && fill > TOO_FULL) {
    out.push({ id: 'overfull', kind: 'spacing', message: 'overfull', params: { percent: Math.round(fill * 100) }, action: { type: 'fit' } });
  } else if (placed.length > 0 && fill < TOO_EMPTY) {
    out.push({ id: 'roomy', kind: 'spacing', message: 'roomy', params: { percent: Math.round(fill * 100) }, action: { type: 'fit' } });
  }

  const patches = placed.flatMap(({ leaf, article }) => {
    const section = detectSection(article);
    if (!section || leaf.style?.kicker) return [];
    return [{ leafId: leaf.id, style: sectionStyle(article, section) }];
  });
  if (patches.length > 0) {
    out.push({ id: 'colour', kind: 'colour', message: 'colour', params: { count: patches.length }, action: { type: 'styles', patches } });
  }

  const leads = placed.filter(({ leaf }) => leaf.role === 'lead' || leaf.role === 'banner');
  if (leads.length > 1) {
    out.push({ id: 'twoLeads', kind: 'balance', message: 'twoLeads', params: { count: leads.length } });
  }
  const longLead = leads.find(({ article }) => article.headline.length > LONG_LEAD_HEADLINE);
  if (longLead) {
    out.push({ id: 'longHeadline', kind: 'content', message: 'longHeadline', params: { chars: longLead.article.headline.length } });
  }
  const hasPicture = leaves.some(
    (l) =>
      (l.element?.type === 'photo' && !!l.element.assetId) ||
      (l.articleId && articles.get(l.articleId)?.body.some((n) => n.type === 'image')),
  );
  if (placed.length >= 3 && !hasPicture) {
    out.push({ id: 'noPicture', kind: 'content', message: 'noPicture' });
  }
  return out;
};

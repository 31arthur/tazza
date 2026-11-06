import type { ArticleNote, ArticleStatus, ArticleVersion } from './Workflow';
import type { ImageAdjust } from './ImageAdjust';

export type Mark = 'bold' | 'italic' | 'underline';

export interface Inline {
  readonly text: string;
  readonly marks?: readonly Mark[];
}

/** Editor-agnostic article body. Language is never stored: it is detected from the text. */
export type BodyNode =
  | { readonly type: 'paragraph'; readonly children: readonly Inline[] }
  | { readonly type: 'subhead'; readonly children: readonly Inline[] }
  | { readonly type: 'pullquote'; readonly children: readonly Inline[] }
  | {
      readonly type: 'list';
      readonly ordered: boolean;
      readonly items: readonly (readonly Inline[])[];
    }
  | {
      readonly type: 'image';
      readonly assetId: string;
      readonly caption: string;
      /** Photographer or agency, printed after the caption. */
      readonly credit?: string;
      readonly adjust?: Partial<ImageAdjust>;
    };

export type ArticleBody = readonly BodyNode[];

export interface Article {
  readonly id: string;
  readonly editionId: string;
  readonly headline: string;
  readonly subHeadline: string;
  readonly byline: string;
  /** Place name set in bold at the start of the story, e.g. "హైదరాబాద్:". */
  readonly dateline?: string;
  readonly body: ArticleBody;
  readonly createdAt: number;
  readonly updatedAt: number;
  /** Missing on stories written before the workflow existed: those count as drafts. */
  readonly status?: ArticleStatus;
  readonly notes?: readonly ArticleNote[];
  readonly versions?: readonly ArticleVersion[];
}

export const statusOf = (article: Article): ArticleStatus => article.status ?? 'draft';

export type ArticlePatch = Partial<Pick<Article, 'headline' | 'subHeadline' | 'byline' | 'dateline' | 'body'>>;

export const inlineText = (children: readonly Inline[]): string =>
  children.map((c) => c.text).join('');

/** Plain text of each text-bearing node (images excluded). */
export const bodyParagraphs = (body: ArticleBody): string[] =>
  body.flatMap((node) => {
    switch (node.type) {
      case 'paragraph':
      case 'subhead':
      case 'pullquote':
        return [inlineText(node.children)];
      case 'list':
        return node.items.map(inlineText);
      case 'image':
        return [];
    }
  });

export const wordCount = (text: string): number => {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/u).length;
};

import type { Article, ArticlePatch } from '../entities/Article';
import { MAX_VERSIONS, type ArticleVersion } from '../entities/Workflow';

/** The text fields a version holds, in the form UpdateArticle takes. */
export const versionPatch = (v: ArticleVersion): Required<Pick<ArticlePatch, 'headline' | 'subHeadline' | 'byline' | 'body'>> &
  Pick<ArticlePatch, 'dateline'> => ({
  headline: v.headline,
  subHeadline: v.subHeadline,
  byline: v.byline,
  body: v.body,
  ...(v.dateline !== undefined && { dateline: v.dateline }),
});

export const snapshotOf = (
  article: Article,
  meta: { id: string; at: number; author: string; label: string },
): ArticleVersion => ({
  ...meta,
  headline: article.headline,
  subHeadline: article.subHeadline,
  byline: article.byline,
  body: article.body,
  ...(article.dateline !== undefined && { dateline: article.dateline }),
});

/** Adds a version at the end, dropping the oldest ones beyond the limit. */
export const withVersion = (article: Article, version: ArticleVersion): readonly ArticleVersion[] =>
  [...(article.versions ?? []), version].slice(-MAX_VERSIONS);

/** True when two snapshots hold the same text, so a repeat save would add nothing. */
export const sameText = (a: ArticleVersion | undefined, b: ArticleVersion): boolean =>
  a !== undefined &&
  a.headline === b.headline &&
  a.subHeadline === b.subHeadline &&
  a.byline === b.byline &&
  (a.dateline ?? '') === (b.dateline ?? '') &&
  JSON.stringify(a.body) === JSON.stringify(b.body);

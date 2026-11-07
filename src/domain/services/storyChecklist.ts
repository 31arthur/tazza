import { bodyParagraphs, wordCount, type Article } from '../entities/Article';

export type ChecklistId = 'headline' | 'deck' | 'dateline' | 'byline' | 'length' | 'photo';

export interface ChecklistItem {
  readonly id: ChecklistId;
  readonly done: boolean;
}

const HEADLINE_MAX = 90;
const MIN_WORDS = 80;

/**
 * What a finished story usually has, so an author can see at a glance what is left before
 * sending it to the editor. Advice only: nothing here blocks sending.
 */
export const storyChecklist = (article: Article): ChecklistItem[] => {
  const headline = article.headline.trim();
  const words = wordCount(bodyParagraphs(article.body).join(' '));
  return [
    { id: 'headline', done: headline !== '' && headline.length <= HEADLINE_MAX },
    { id: 'deck', done: article.subHeadline.trim() !== '' },
    { id: 'dateline', done: (article.dateline ?? '').trim() !== '' },
    { id: 'byline', done: article.byline.trim() !== '' },
    { id: 'length', done: words >= MIN_WORDS },
    { id: 'photo', done: article.body.some((n) => n.type === 'image') },
  ];
};

/** Share of the checklist done, 0 to 1. */
export const checklistProgress = (items: readonly ChecklistItem[]): number =>
  items.length === 0 ? 0 : items.filter((i) => i.done).length / items.length;

/** Minutes to read at a relaxed 200 words a minute, at least one. */
export const readingMinutes = (article: Article): number =>
  Math.max(1, Math.round(wordCount(bodyParagraphs(article.body).join(' ')) / 200));

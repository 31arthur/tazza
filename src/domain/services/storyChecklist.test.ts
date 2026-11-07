import type { Article } from '../entities/Article';
import { checklistProgress, readingMinutes, storyChecklist } from './storyChecklist';

const words = (n: number) => Array(n).fill('word').join(' ');
const article = (extra: Partial<Article> = {}): Article => ({
  id: 'a',
  editionId: 'e',
  headline: '',
  subHeadline: '',
  byline: '',
  body: [{ type: 'paragraph', children: [] }],
  createdAt: 1,
  updatedAt: 1,
  ...extra,
});

describe('story checklist', () => {
  it('starts with nothing done on an empty story', () => {
    const items = storyChecklist(article());
    expect(items.every((i) => !i.done)).toBe(true);
    expect(checklistProgress(items)).toBe(0);
  });

  it('marks each part as it is filled in', () => {
    const done = storyChecklist(
      article({
        headline: 'Metro phase two begins',
        subHeadline: 'Lakhs to benefit',
        dateline: 'HYDERABAD:',
        byline: 'Staff reporter',
        body: [
          { type: 'paragraph', children: [{ text: words(90) }] },
          { type: 'image', assetId: 'p', caption: '' },
        ],
      }),
    );
    expect(done.every((i) => i.done)).toBe(true);
    expect(checklistProgress(done)).toBe(1);
  });

  it('treats an over-long headline as not done yet', () => {
    const items = storyChecklist(article({ headline: 'x'.repeat(100) }));
    expect(items.find((i) => i.id === 'headline')?.done).toBe(false);
  });

  it('estimates reading time', () => {
    expect(readingMinutes(article())).toBe(1);
    expect(readingMinutes(article({ body: [{ type: 'paragraph', children: [{ text: words(600) }] }] }))).toBe(3);
  });
});

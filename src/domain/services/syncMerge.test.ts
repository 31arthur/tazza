import type { Article } from '../entities/Article';
import type { Edition } from '../entities/Edition';
import { makeLeaf } from '../layout/tree';
import { mergeArticle, mergeEdition, sameData } from './syncMerge';

const article = (extra: Partial<Article> = {}): Article => ({
  id: 'a1',
  editionId: 'e',
  headline: 'Base',
  subHeadline: 'Sub',
  byline: 'By',
  body: [{ type: 'paragraph', children: [{ text: 'text' }] }],
  createdAt: 1,
  updatedAt: 10,
  ...extra,
});

describe('sameData', () => {
  it('ignores field order and undefined fields', () => {
    expect(sameData({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true);
    expect(sameData({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(sameData([1, 2], [2, 1])).toBe(false);
  });
});

describe('merging a story', () => {
  const base = article();

  it('takes each part from whichever side changed it', () => {
    const local = article({ headline: 'Mine', updatedAt: 20 });
    const remote = article({ byline: 'Theirs', updatedAt: 30 });
    const { merged, conflicts } = mergeArticle(base, local, remote);
    expect(merged).toMatchObject({ headline: 'Mine', byline: 'Theirs', updatedAt: 30 });
    expect(conflicts).toEqual([]);
  });

  it('lets the most recently edited side win a part changed on both, and reports it', () => {
    const local = article({ headline: 'Mine', updatedAt: 40 });
    const remote = article({ headline: 'Theirs', updatedAt: 30 });
    const newerLocal = mergeArticle(base, local, remote);
    expect(newerLocal.merged.headline).toBe('Mine');
    expect(newerLocal.conflicts).toEqual(['headline']);
    expect(mergeArticle(base, { ...local, updatedAt: 20 }, remote).merged.headline).toBe('Theirs');
  });

  it('keeps the comments and versions of both sides, and a comment resolved on either', () => {
    const note = (id: string, at: number, resolved = false) => ({
      id,
      author: 'x',
      role: 'editor' as const,
      text: id,
      at,
      resolved,
    });
    const local = article({ notes: [note('n1', 1), note('n2', 2)], updatedAt: 20 });
    const remote = article({ notes: [note('n1', 1, true), note('n3', 3)], updatedAt: 30 });
    const { merged } = mergeArticle(base, local, remote);
    expect(merged.notes?.map((n) => [n.id, n.resolved])).toEqual([
      ['n1', true],
      ['n2', false],
      ['n3', false],
    ]);
  });

  it('without a shared starting point, the newer story wins without calling it a conflict', () => {
    const { merged, conflicts } = mergeArticle(undefined, article({ headline: 'A', updatedAt: 5 }), article({ headline: 'B', updatedAt: 9 }));
    expect(merged.headline).toBe('B');
    expect(conflicts).toEqual([]);
  });
});

describe('merging an edition', () => {
  const page = (number: number, id: string) => ({ number, layout: makeLeaf(id) });
  const edition = (...pages: ReturnType<typeof page>[]): Edition => ({ id: 'e', pages });
  const base = edition(page(1, 'a'), page(2, 'b'));

  it('combines changes to different pages', () => {
    const local = edition(page(1, 'a-mine'), page(2, 'b'));
    const remote = edition(page(1, 'a'), page(2, 'b-theirs'));
    const { merged, conflicts } = mergeEdition(base, local, remote);
    expect(merged.pages.map((p) => (p.layout as { id: string }).id)).toEqual(['a-mine', 'b-theirs']);
    expect(conflicts).toEqual([]);
  });

  it('keeps this computer\'s page when both changed the same page, and says so', () => {
    const local = edition(page(1, 'a-mine'), page(2, 'b'));
    const remote = edition(page(1, 'a-theirs'), page(2, 'b'));
    const { merged, conflicts } = mergeEdition(base, local, remote);
    expect((merged.pages[0]?.layout as { id: string }).id).toBe('a-mine');
    expect(conflicts).toEqual(['page 1']);
  });

  it('adds a page the other side added, and follows a deletion of an unchanged page', () => {
    const local = edition(page(1, 'a'), page(2, 'b'), page(3, 'c'));
    const remote = edition(page(1, 'a'));
    const { merged, conflicts } = mergeEdition(base, local, remote);
    expect(merged.pages.map((p) => p.number)).toEqual([1, 3]);
    expect(conflicts).toEqual([]);
  });

  it('keeps a page that was changed on one side while the other deleted it', () => {
    const local = edition(page(1, 'a'), page(2, 'b-mine'));
    const remote = edition(page(1, 'a'));
    const { merged, conflicts } = mergeEdition(base, local, remote);
    expect(merged.pages.map((p) => p.number)).toEqual([1, 2]);
    expect(conflicts).toEqual(['page 2']);
  });

  it('merges the masthead and masters like any other part', () => {
    const local: Edition = { ...base, masthead: { title: 'ఎ' } };
    const remote: Edition = { ...base, masters: [{ id: 'm', name: 'M', objects: [] }] };
    const { merged } = mergeEdition(base, local, remote);
    expect(merged.masthead).toEqual({ title: 'ఎ' });
    expect(merged.masters).toHaveLength(1);
  });
});

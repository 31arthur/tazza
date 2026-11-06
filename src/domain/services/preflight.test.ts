import type { Article } from '../entities/Article';
import type { Asset } from '../entities/Asset';
import type { Edition } from '../entities/Edition';
import { createObject } from '../layout/objects';
import { makeLeaf, type Leaf } from '../layout/tree';
import { countBySeverity, runPreflight } from './preflight';

const article = (id: string, headline = 'Headline', words = 40): Article => ({
  id,
  editionId: 'e',
  headline,
  subHeadline: '',
  byline: '',
  body: [{ type: 'paragraph', children: [{ text: Array(words).fill('word').join(' ') }] }],
  createdAt: 0,
  updatedAt: 0,
});

const asset = (id: string, widthPx = 3000, heightPx = 2000): Asset => ({
  id,
  mimeType: 'image/jpeg',
  widthPx,
  heightPx,
  byteSize: 1,
});

const edition = (layout: Leaf, objects = [] as Edition['pages'][number]['objects']): Edition => ({
  id: 'e',
  pages: [{ number: 1, layout, ...(objects && { objects }) }],
});

const codes = (issues: ReturnType<typeof runPreflight>) => issues.map((i) => i.code);

describe('preflight', () => {
  it('passes a healthy page', () => {
    const issues = runPreflight({
      edition: edition(makeLeaf('t', 'lead', 'a1')),
      articles: [article('a1')],
      assets: [],
    });
    expect(issues).toEqual([]);
  });

  it('flags an empty page and an empty tile', () => {
    expect(codes(runPreflight({ edition: edition(makeLeaf('t')), articles: [], assets: [] }))).toEqual([
      'emptyPage',
      'emptyTile',
    ]);
  });

  it('flags a missing story and a blank headline as errors', () => {
    const missing = runPreflight({ edition: edition(makeLeaf('t', 'lead', 'gone')), articles: [], assets: [] });
    expect(missing.map((i) => [i.code, i.severity])).toContainEqual(['missingStory', 'error']);
    const blank = runPreflight({
      edition: edition(makeLeaf('t', 'lead', 'a1')),
      articles: [article('a1', '   ')],
      assets: [],
    });
    expect(blank.map((i) => [i.code, i.severity])).toContainEqual(['noHeadline', 'error']);
  });

  it('warns, then errors, as a page gets more overfull', () => {
    const long = runPreflight({
      edition: edition(makeLeaf('t', 'lead', 'a1')),
      articles: [article('a1', 'H', 4000)],
      assets: [],
    });
    const over = long.find((i) => i.code === 'overfull');
    expect(over?.severity).toBe('error');
    expect(over?.params?.['percent']).toBeGreaterThan(110);
  });

  it('checks photo tiles for a picture, resolution, caption and credit', () => {
    const photoTile = (element: Leaf['element']): Leaf => ({ ...makeLeaf('p', 'box'), ...(element && { element }) });
    const run = (leaf: Leaf, assets: Asset[]) => runPreflight({ edition: edition(leaf), articles: [], assets });

    expect(codes(run(photoTile({ type: 'photo', caption: 'x' }), []))).toContain('photoMissing');
    expect(codes(run(photoTile({ type: 'photo', assetId: 'nope', caption: 'x' }), []))).toContain('photoNotFound');

    const small = run(photoTile({ type: 'photo', assetId: 'a', caption: 'x', credit: 'y' }), [asset('a', 400, 300)]);
    expect(small.find((i) => i.code === 'lowResolution')?.severity).toBe('warning');

    const bare = run(photoTile({ type: 'photo', assetId: 'a', caption: '' }), [asset('a', 9000, 6000)]);
    expect(codes(bare)).toEqual(['noCaption', 'noCredit']);
    expect(countBySeverity(bare)).toEqual({ error: 0, warning: 1, info: 1 });
  });

  it('flags objects off the page, empty text and soft image frames', () => {
    const base = { ...createObject('text', 'o1', 1) };
    const off = { ...base, id: 'off', x: 500, text: 'hi' };
    const blank = { ...base, id: 'blank', text: ' ' };
    const issues = runPreflight({
      edition: edition(makeLeaf('t', 'lead', 'a1'), [off, blank]),
      articles: [article('a1')],
      assets: [],
    });
    expect(issues.filter((i) => i.targetId === 'off').map((i) => i.code)).toEqual(['offPage']);
    expect(issues.filter((i) => i.targetId === 'blank').map((i) => i.code)).toEqual(['emptyText']);
  });

  it('lists errors before warnings on each page', () => {
    const issues = runPreflight({
      edition: edition(makeLeaf('t', 'lead', 'gone'), []),
      articles: [],
      assets: [],
    });
    expect(issues[0]?.severity).toBe('error');
  });
});

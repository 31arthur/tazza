import type { Article } from '../entities/Article';
import { canOpen, landingFor } from '../entities/Workflow';
import { makeLeaf, type LayoutNode } from '../layout/tree';
import { advisePage, detectSection, sectionStyle } from './designAdvisor';

const story = (id: string, headline: string, body = ''): Article => ({
  id,
  editionId: 'e',
  headline,
  subHeadline: '',
  byline: '',
  body: [{ type: 'paragraph', children: [{ text: body }] }],
  createdAt: 1,
  updatedAt: 1,
});

const page = (...leaves: ReturnType<typeof makeLeaf>[]): LayoutNode => ({
  kind: 'split',
  id: 's',
  direction: 'column',
  sizes: leaves.map(() => 1),
  children: leaves,
});

describe('section detection', () => {
  it('reads sections from English and Telugu stories', () => {
    expect(detectSection(story('1', 'Local XI clinch district cricket title'))).toBe('sports');
    expect(detectSection(story('2', 'రైతులకు వర్షం కష్టాలు'))).toBe('weather');
    expect(detectSection(story('3', 'Sensex up 2,946 points as market rallies'))).toBe('business');
    expect(detectSection(story('4', 'A quiet morning'))).toBeUndefined();
  });

  it('prefers the headline over the opening text', () => {
    expect(detectSection(story('1', 'Chief Minister opens digital schools', 'The match was rained out.'))).toBe('politics');
  });

  it('sets the kicker in the story\'s own language', () => {
    expect(sectionStyle(story('1', 'cricket'), 'sports')).toMatchObject({ kicker: 'SPORTS', accent: 'blue' });
    expect(sectionStyle(story('1', 'క్రికెట్ విజయం'), 'sports').kicker).toBe('క్రీడలు');
  });
});

describe('page advice', () => {
  const articles = new Map([
    ['a', story('a', 'Cricket final tonight')],
    ['b', story('b', 'Sensex jumps')],
    ['c', story('c', 'Plain headline')],
  ]);
  const layout = page(makeLeaf('t1', 'story', 'a'), makeLeaf('t2', 'story', 'b'), makeLeaf('t3', 'story', 'c'));

  it('offers to colour-code stories whose section it recognises, once', () => {
    const colour = advisePage({ layout, articles, fill: 0.9, unplacedCount: 0 }).find((s) => s.id === 'colour');
    expect(colour?.params).toEqual({ count: 2 });
    expect(colour?.action).toMatchObject({ type: 'styles' });
    const coded = page({ ...makeLeaf('t1', 'story', 'a'), style: { kicker: 'SPORTS' } }, makeLeaf('t3', 'story', 'c'));
    expect(advisePage({ layout: coded, articles, fill: 0.9, unplacedCount: 0 }).some((s) => s.id === 'colour')).toBe(false);
  });

  it('notices a page that is too full or too empty, and waiting stories', () => {
    const ids = (fill: number, unplaced = 0) => advisePage({ layout, articles, fill, unplacedCount: unplaced }).map((s) => s.id);
    expect(ids(1.3)).toContain('overfull');
    expect(ids(0.5)).toContain('roomy');
    expect(ids(0.9)).not.toContain('overfull');
    expect(ids(0.9, 2)).toContain('unplaced');
  });

  it('warns about two leads, a long lead headline and a page with no picture', () => {
    const lead = page(makeLeaf('t1', 'lead', 'a'), makeLeaf('t2', 'banner', 'b'), makeLeaf('t3', 'story', 'c'));
    const long = new Map(articles).set('a', story('a', 'x'.repeat(100)));
    const ids = advisePage({ layout: lead, articles: long, fill: 0.9, unplacedCount: 0 }).map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['twoLeads', 'longHeadline', 'noPicture']));
  });
});

describe('who can go where', () => {
  it('keeps authors to writing, editors everywhere, designers to the page', () => {
    expect(canOpen('reporter', 'write')).toBe(true);
    expect(canOpen('reporter', 'studio')).toBe(false);
    expect(canOpen('editor', 'studio')).toBe(true);
    expect(canOpen('designer', 'write')).toBe(false);
    expect([landingFor('reporter'), landingFor('editor'), landingFor('designer')]).toEqual(['write', 'newsroom', 'studio']);
  });
});

import type { Article } from '../../entities/Article';
import { BRAND_KIT_ID } from '../../entities/LibraryItem';
import { LayoutError } from '../../errors/DomainError';
import { groupObjects } from '../../layout/selection';
import { reidentifyObjects, stripArticles } from '../../layout/template';
import { articleIdsOf, leavesOf, makeLeaf } from '../../layout/tree';
import { createObject } from '../../layout/objects';
import {
  FixedClock,
  InMemoryArticleRepository,
  InMemoryEditionRepository,
  InMemoryLibraryRepository,
  SequentialIds,
} from '../../testing/fakes';
import { GetOrCreateEdition } from '../edition/GetOrCreateEdition';
import { AutoLayout } from '../layout/AutoLayout';
import { ApplyEditionTemplate } from '../library/ApplyEditionTemplate';
import { ApplyPageTemplate } from '../library/ApplyPageTemplate';
import { DeleteLibraryItem } from '../library/DeleteLibraryItem';
import { ListLibrary } from '../library/ListLibrary';
import { SaveBrandKit } from '../library/SaveBrandKit';
import { SaveEditionTemplate } from '../library/SaveEditionTemplate';
import { SavePageTemplate } from '../library/SavePageTemplate';
import { SaveTileStyle } from '../library/SaveTileStyle';
import { AddObject } from '../objects/AddObject';
import { UpdateObjects } from '../objects/UpdateObjects';
import { AssignMaster } from './AssignMaster';
import { CreateMaster } from './CreateMaster';
import { DeleteMaster } from './DeleteMaster';
import { RenameMaster } from './RenameMaster';

const EDITION = '2026-11-08';
const NEXT = '2026-11-09';

const story = (id: string, chars: number): Article => ({
  id,
  editionId: EDITION,
  headline: `Story ${id}`,
  subHeadline: '',
  byline: '',
  body: [{ type: 'paragraph', children: [{ text: 'word '.repeat(Math.ceil(chars / 5)) }] }],
  createdAt: Number(id),
  updatedAt: Number(id),
});

const setup = async () => {
  const articles = new InMemoryArticleRepository();
  const editions = new InMemoryEditionRepository();
  const library = new InMemoryLibraryRepository();
  const ids = new SequentialIds();
  const clock = new FixedClock();
  await new GetOrCreateEdition(editions, ids, library).execute({ editionId: EDITION });
  const ref = { editionId: EDITION, pageNumber: 1 };
  return {
    articles,
    editions,
    library,
    ids,
    clock,
    ref,
    edition: async (id = EDITION) => (await editions.find(id)) ?? { id, pages: [] },
    addObject: new AddObject(editions, ids),
  };
};

describe('masters', () => {
  it('builds a master from page objects, moving them off the page', async () => {
    const s = await setup();
    await s.addObject.execute({ ...s.ref, tool: 'rect' });
    await s.addObject.execute({ ...s.ref, tool: 'text' });

    const { masterId, edition } = await new CreateMaster(s.editions, s.ids).execute({
      editionId: EDITION,
      name: 'Section header',
      fromPageNumber: 1,
    });
    const master = edition.masters?.[0];
    expect(master?.id).toBe(masterId);
    expect(master?.objects).toHaveLength(2);
    expect(edition.pages[0]?.objects).toEqual([]);
    expect(edition.pages[0]?.masterId).toBe(masterId);
  });

  it('can copy instead of move, and start empty', async () => {
    const s = await setup();
    await s.addObject.execute({ ...s.ref, tool: 'rect' });
    const copied = await new CreateMaster(s.editions, s.ids).execute({
      editionId: EDITION,
      name: 'Copy',
      fromPageNumber: 1,
      move: false,
    });
    expect(copied.edition.pages[0]?.objects).toHaveLength(1);
    expect(copied.edition.masters?.[0]?.objects[0]?.id).not.toBe(
      copied.edition.pages[0]?.objects?.[0]?.id,
    );

    const empty = await new CreateMaster(s.editions, s.ids).execute({
      editionId: EDITION,
      name: '  ',
    });
    expect(empty.edition.masters?.[1]).toMatchObject({ name: 'Master', objects: [] });
  });

  it('routes object commands to the master when asked', async () => {
    const s = await setup();
    const { masterId } = await new CreateMaster(s.editions, s.ids).execute({
      editionId: EDITION,
      name: 'M',
    });
    const { objectId } = await s.addObject.execute({ ...s.ref, masterId, tool: 'line' });
    await new UpdateObjects(s.editions).execute({
      ...s.ref,
      masterId,
      updates: [{ id: objectId, patch: { x: 12 } }],
    });
    const edition = await s.edition();
    expect(edition.masters?.[0]?.objects[0]).toMatchObject({ id: objectId, x: 12 });
    expect(edition.pages[0]?.objects ?? []).toEqual([]);

    await expect(
      s.addObject.execute({ ...s.ref, masterId: 'nope', tool: 'rect' }),
    ).rejects.toBeInstanceOf(LayoutError);
  });

  it('assigns, renames and deletes masters', async () => {
    const s = await setup();
    const { masterId } = await new CreateMaster(s.editions, s.ids).execute({
      editionId: EDITION,
      name: 'A',
    });
    const assign = new AssignMaster(s.editions);
    expect((await assign.execute({ ...s.ref, masterId })).pages[0]?.masterId).toBe(masterId);
    await expect(assign.execute({ ...s.ref, masterId: 'nope' })).rejects.toBeInstanceOf(LayoutError);

    const renamed = await new RenameMaster(s.editions).execute({ editionId: EDITION, masterId, name: 'B' });
    expect(renamed.masters?.[0]?.name).toBe('B');

    const afterDelete = await new DeleteMaster(s.editions).execute({ editionId: EDITION, masterId });
    expect(afterDelete.masters).toEqual([]);
    expect(afterDelete.pages[0]?.masterId).toBeUndefined();

    expect((await assign.execute({ ...s.ref })).pages[0]?.masterId).toBeUndefined();
  });
});

describe('templates', () => {
  it('strips stories but keeps structure, elements and order', () => {
    const tree = {
      kind: 'split' as const,
      id: 's',
      direction: 'column' as const,
      sizes: [1, 1],
      children: [
        makeLeaf('a', 'banner', 'story-1'),
        { ...makeLeaf('b', 'story'), element: { type: 'label' as const, text: 'SPORTS' } },
      ],
    };
    const stripped = leavesOf(stripArticles(tree));
    expect(stripped.map((l) => l.articleId)).toEqual([undefined, undefined]);
    expect(stripped.map((l) => l.priority)).toEqual([1, 2]);
    expect(stripped[1]?.element).toEqual({ type: 'label', text: 'SPORTS' });
    expect(stripped[0]?.role).toBe('banner');
  });

  it('gives copies new ids and keeps groups together', () => {
    const ids = new SequentialIds();
    const list = groupObjects(
      [createObject('rect', 'a', 1), createObject('rect', 'b', 1), createObject('rect', 'c', 1)],
      ['a', 'b'],
      'g',
    );
    const copy = reidentifyObjects(list, ids);
    expect(copy.map((o) => o.id)).not.toContain('a');
    expect(copy[0]?.groupId).toBeDefined();
    expect(copy[0]?.groupId).toBe(copy[1]?.groupId);
    expect(copy[0]?.groupId).not.toBe('g');
    expect(copy[2]?.groupId).toBeUndefined();
  });

  it('saves a page as a template and starts another page from it', async () => {
    const s = await setup();
    for (let i = 1; i <= 4; i++) await s.articles.save(story(String(i), 400));
    await new AutoLayout(s.articles, s.editions, s.ids).execute({ editionId: EDITION });
    await s.addObject.execute({ ...s.ref, tool: 'rect' });

    const saved = await new SavePageTemplate(s.editions, s.library, s.ids, s.clock).execute({
      ...s.ref,
      name: 'Front',
    });
    expect(saved.kind === 'pageTemplate' && leavesOf(saved.page.layout).every((l) => !l.articleId)).toBe(true);
    expect(saved.kind === 'pageTemplate' && saved.page.objects).toHaveLength(1);

    // Used twice on the same page: ids stay unique and stories are poured back in.
    const apply = new ApplyPageTemplate(s.articles, s.editions, s.library, s.ids);
    const first = await apply.execute({ ...s.ref, templateId: saved.id });
    const second = await apply.execute({ ...s.ref, templateId: saved.id });
    expect(articleIdsOf(second.pages[0]?.layout ?? makeLeaf('x')).length).toBeGreaterThan(0);
    expect(first.pages[0]?.objects?.[0]?.id).not.toBe(second.pages[0]?.objects?.[0]?.id);
    expect(second.pages[0]?.objects).toHaveLength(1);
  });

  it('rejects applying something that is not a page template', async () => {
    const s = await setup();
    await expect(
      new ApplyPageTemplate(s.articles, s.editions, s.library, s.ids).execute({
        ...s.ref,
        templateId: 'missing',
      }),
    ).rejects.toBeInstanceOf(LayoutError);
  });

  it('turns a whole edition into a template for another day', async () => {
    const s = await setup();
    const { masterId } = await new CreateMaster(s.editions, s.ids).execute({
      editionId: EDITION,
      name: 'Header',
    });
    await new AssignMaster(s.editions).execute({ ...s.ref, masterId });
    await new UpdateObjects(s.editions).execute({ ...s.ref, updates: [] });
    await s.editions.save({
      ...(await s.edition()),
      masthead: { title: 'వార్త', color: 'red' },
    });
    const saved = await new SaveEditionTemplate(s.editions, s.library, s.ids, s.clock).execute({
      editionId: EDITION,
      name: 'Weekday',
    });

    await new GetOrCreateEdition(s.editions, s.ids).execute({ editionId: NEXT });
    const edition = await new ApplyEditionTemplate(
      s.articles,
      s.editions,
      s.library,
      s.ids,
    ).execute({ editionId: NEXT, templateId: saved.id });
    expect(edition.id).toBe(NEXT);
    expect(edition.masthead).toEqual({ title: 'వార్త', color: 'red' });
    expect(edition.masters).toHaveLength(1);
    expect(edition.pages.length).toBe(1);
    // The page keeps using the master it used when the template was saved.
    expect(edition.pages[0]?.masterId).toBe(masterId);
  });
});

describe('library', () => {
  it('saves tile styles and lists newest first, and deletes', async () => {
    const s = await setup();
    const save = new SaveTileStyle(s.library, s.ids, s.clock);
    const a = await save.execute({ name: 'Urgent', role: 'lead', style: { accent: 'red' } });
    const b = await save.execute({ name: '  ', role: 'box', style: { tint: 'pink' } });
    const list = await new ListLibrary(s.library).execute();
    expect(list.map((i) => i.id)).toEqual([b.id, a.id]);
    expect(b.name).toBe('Style');

    await new DeleteLibraryItem(s.library).execute({ id: a.id });
    expect((await new ListLibrary(s.library).execute()).map((i) => i.id)).toEqual([b.id]);
  });

  it('keeps one brand kit and uses it for new editions', async () => {
    const s = await setup();
    const save = new SaveBrandKit(s.library, s.clock);
    await save.execute({ masthead: { title: 'పాత', color: 'blue' } });
    await save.execute({ masthead: { title: 'వార్త', color: 'red', tagline: 'Daily' } });
    const kits = (await s.library.list()).filter((i) => i.kind === 'brandKit');
    expect(kits).toHaveLength(1);
    expect(kits[0]?.id).toBe(BRAND_KIT_ID);

    const created = await new GetOrCreateEdition(s.editions, s.ids, s.library).execute({
      editionId: NEXT,
    });
    expect(created.masthead).toEqual({ title: 'వార్త', color: 'red', tagline: 'Daily' });
    // An edition made earlier is not rewritten.
    expect((await s.edition()).masthead).toBeUndefined();
  });
});

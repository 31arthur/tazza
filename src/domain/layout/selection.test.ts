import { LayoutError } from '../errors/DomainError';
import { GRID } from '../services/PageGeometry';
import { InMemoryEditionRepository, SequentialIds } from '../testing/fakes';
import { GetOrCreateEdition } from '../usecases/edition/GetOrCreateEdition';
import { AddObject } from '../usecases/objects/AddObject';
import { AlignObjects } from '../usecases/objects/AlignObjects';
import { DistributeObjects } from '../usecases/objects/DistributeObjects';
import { DuplicateObjects } from '../usecases/objects/DuplicateObjects';
import { GroupObjects } from '../usecases/objects/GroupObjects';
import { RemoveObjects } from '../usecases/objects/RemoveObjects';
import { ReorderObjects } from '../usecases/objects/ReorderObjects';
import { SetGuides } from '../usecases/objects/SetGuides';
import { UngroupObjects } from '../usecases/objects/UngroupObjects';
import { UpdateObjects } from '../usecases/objects/UpdateObjects';
import { createObject, type PageObject } from './objects';
import {
  alignMany,
  boundsOf,
  distributeMany,
  expandGroups,
  groupObjects,
  objectsInRect,
  reorderMany,
  ungroupObjects,
} from './selection';
import { snapMove, snapTargets } from './snapping';

const EDITION = '2026-11-07';

const box = (id: string, x: number, y: number, w = 10, h = 10): PageObject => ({
  ...createObject('rect', id, 2),
  x,
  y,
  w,
  h,
});

describe('selection helpers', () => {
  it('expands to whole groups', () => {
    const list = groupObjects([box('a', 0, 0), box('b', 20, 0), box('c', 40, 0)], ['a', 'b'], 'g1');
    expect(expandGroups(list, ['a'])).toEqual(['a', 'b']);
    expect(expandGroups(list, ['c'])).toEqual(['c']);
    expect(expandGroups(list, ['a', 'c'])).toEqual(['a', 'b', 'c']);
    expect(expandGroups(ungroupObjects(list, ['a', 'b']), ['a'])).toEqual(['a']);
  });

  it('finds the bounds of several objects', () => {
    expect(boundsOf([box('a', 10, 20, 10, 10), box('b', 40, 5, 20, 10)])).toEqual({
      x: 10,
      y: 5,
      w: 50,
      h: 25,
    });
    expect(boundsOf([])).toBeUndefined();
  });

  it('marquee selects visible, unlocked objects that touch the rectangle', () => {
    const list = [
      box('in', 10, 10),
      box('edge', 28, 10),
      box('out', 100, 100),
      { ...box('hidden', 12, 12), hidden: true },
      { ...box('locked', 12, 12), locked: true },
    ];
    expect(objectsInRect(list, { x: 0, y: 0, w: 30, h: 30 })).toEqual(['in', 'edge']);
  });

  it('aligns to the shared bounds', () => {
    const list = [box('a', 10, 10, 10, 10), box('b', 50, 40, 20, 20)];
    const bounds = boundsOf(list);
    expect(bounds && alignMany(list, 'left', bounds)).toEqual([
      { id: 'a', patch: { x: 10 } },
      { id: 'b', patch: { x: 10 } },
    ]);
    expect(bounds && alignMany(list, 'bottom', bounds)).toEqual([
      { id: 'a', patch: { y: 50 } },
      { id: 'b', patch: { y: 40 } },
    ]);
  });

  it('distributes evenly and leaves the outer two in place', () => {
    const list = [box('a', 0, 0), box('b', 15, 0), box('c', 90, 0)];
    const result = distributeMany(list, 'horizontal');
    const x = Object.fromEntries(result.map((r) => [r.id, r.patch.x]));
    expect(x).toEqual({ a: 0, b: 45, c: 90 });
    expect(distributeMany(list.slice(0, 2), 'horizontal')).toEqual([]);
    expect(distributeMany(list, 'vertical').map((r) => r.patch.y)).toEqual([0, 0, 0]);
  });

  it('reorders several objects at once, keeping their relative order', () => {
    const list = [box('a', 0, 0), box('b', 0, 0), box('c', 0, 0), box('d', 0, 0)];
    const ids = (o: PageObject[]) => o.map((x) => x.id).join('');
    expect(ids(reorderMany(list, ['a', 'c'], 'front'))).toBe('bdac');
    expect(ids(reorderMany(list, ['b', 'd'], 'back'))).toBe('bdac');
    expect(ids(reorderMany(list, ['a', 'b'], 'forward'))).toBe('cabd');
    expect(ids(reorderMany(list, ['c', 'd'], 'backward'))).toBe('acdb');
    expect(ids(reorderMany(list, ['c', 'd'], 'forward'))).toBe('abcd');
  });

  it('snaps to custom guides', () => {
    const t = snapTargets(2, [], [{ axis: 'x', at: 123.4 }, { axis: 'y', at: 222.2 }]);
    const snapped = snapMove({ x: 122.9, y: 221.8, w: 10, h: 10 }, t, 1);
    expect(snapped.x).toBeCloseTo(123.4);
    expect(snapped.y).toBeCloseTo(222.2);
  });
});

describe('multi-object use cases', () => {
  const setup = async () => {
    const editions = new InMemoryEditionRepository();
    const ids = new SequentialIds();
    await new GetOrCreateEdition(editions, ids).execute({ editionId: EDITION });
    const ref = { editionId: EDITION, pageNumber: 1 };
    const add = new AddObject(editions, ids);
    const objects = async () => (await editions.find(EDITION))?.pages[0]?.objects ?? [];
    const create = async (n: number): Promise<string[]> => {
      const made: string[] = [];
      for (let i = 0; i < n; i++) made.push((await add.execute({ ...ref, tool: 'rect' })).objectId);
      return made;
    };
    return { editions, ids, ref, objects, create };
  };

  it('updates several objects in one step', async () => {
    const s = await setup();
    const [a, b] = await s.create(2);
    await new UpdateObjects(s.editions).execute({
      ...s.ref,
      updates: [
        { id: a ?? '', patch: { x: 11 } },
        { id: b ?? '', patch: { x: 22 } },
      ],
    });
    expect((await s.objects()).map((o) => o.x)).toEqual([11, 22]);
    await expect(
      new UpdateObjects(s.editions).execute({ ...s.ref, updates: [{ id: 'nope', patch: { x: 1 } }] }),
    ).rejects.toBeInstanceOf(LayoutError);
  });

  it('groups, then acts on the whole group, then ungroups', async () => {
    const s = await setup();
    const [a, b, c] = await s.create(3);
    await new GroupObjects(s.editions, s.ids).execute({ ...s.ref, objectIds: [a ?? '', b ?? ''] });
    const grouped = await s.objects();
    expect(grouped[0]?.groupId).toBeDefined();
    expect(grouped[0]?.groupId).toBe(grouped[1]?.groupId);
    expect(grouped[2]?.groupId).toBeUndefined();

    // Asking for one member reaches the whole group.
    await new RemoveObjects(s.editions).execute({ ...s.ref, objectIds: [a ?? ''] });
    expect((await s.objects()).map((o) => o.id)).toEqual([c]);

    const [d, e] = await s.create(2);
    await new GroupObjects(s.editions, s.ids).execute({ ...s.ref, objectIds: [d ?? '', e ?? ''] });
    await new UngroupObjects(s.editions).execute({ ...s.ref, objectIds: [d ?? ''] });
    expect((await s.objects()).every((o) => o.groupId === undefined)).toBe(true);
  });

  it('refuses to group fewer than two objects', async () => {
    const s = await setup();
    const [a] = await s.create(1);
    await expect(
      new GroupObjects(s.editions, s.ids).execute({ ...s.ref, objectIds: [a ?? ''] }),
    ).rejects.toBeInstanceOf(LayoutError);
  });

  it('duplicates a group as a new group', async () => {
    const s = await setup();
    const [a, b] = await s.create(2);
    await new GroupObjects(s.editions, s.ids).execute({ ...s.ref, objectIds: [a ?? '', b ?? ''] });
    const { objectIds } = await new DuplicateObjects(s.editions, s.ids).execute({
      ...s.ref,
      objectIds: [a ?? ''],
    });
    const all = await s.objects();
    expect(all).toHaveLength(4);
    expect(objectIds).toHaveLength(2);
    const copies = all.filter((o) => objectIds.includes(o.id));
    expect(copies[0]?.groupId).toBeDefined();
    expect(copies[0]?.groupId).toBe(copies[1]?.groupId);
    expect(copies[0]?.groupId).not.toBe(all[0]?.groupId);
  });

  it('aligns to the selection, the margins and the page, skipping locked objects', async () => {
    const s = await setup();
    const [a, b] = await s.create(2);
    await new UpdateObjects(s.editions).execute({
      ...s.ref,
      updates: [
        { id: a ?? '', patch: { x: 30, w: 10 } },
        { id: b ?? '', patch: { x: 80, w: 20 } },
      ],
    });
    const align = new AlignObjects(s.editions);
    await align.execute({ ...s.ref, objectIds: [a ?? '', b ?? ''], mode: 'left', to: 'selection' });
    expect((await s.objects()).map((o) => o.x)).toEqual([30, 30]);

    await align.execute({ ...s.ref, objectIds: [a ?? '', b ?? ''], mode: 'right', to: 'live' });
    const right = GRID.pageWidthMm - GRID.marginXMm;
    expect((await s.objects()).map((o) => o.x + o.w)).toEqual([right, right]);

    await new UpdateObjects(s.editions).execute({
      ...s.ref,
      updates: [{ id: b ?? '', patch: { locked: true } }],
    });
    await align.execute({ ...s.ref, objectIds: [a ?? '', b ?? ''], mode: 'left', to: 'page' });
    const after = await s.objects();
    expect(after[0]?.x).toBe(0);
    expect(after[1]?.x).not.toBe(0);
  });

  it('distributes and reorders selections', async () => {
    const s = await setup();
    const [a, b, c] = await s.create(3);
    await new UpdateObjects(s.editions).execute({
      ...s.ref,
      updates: [
        { id: a ?? '', patch: { x: 0, w: 10 } },
        { id: b ?? '', patch: { x: 15, w: 10 } },
        { id: c ?? '', patch: { x: 90, w: 10 } },
      ],
    });
    await new DistributeObjects(s.editions).execute({
      ...s.ref,
      objectIds: [a ?? '', b ?? '', c ?? ''],
      axis: 'horizontal',
    });
    expect((await s.objects()).map((o) => o.x)).toEqual([0, 45, 90]);

    await new ReorderObjects(s.editions).execute({ ...s.ref, objectIds: [a ?? ''], op: 'front' });
    expect((await s.objects()).map((o) => o.id)).toEqual([b, c, a]);
  });

  it('stores ruler guides and rejects guides off the page', async () => {
    const s = await setup();
    const set = new SetGuides(s.editions);
    const edition = await set.execute({ ...s.ref, guides: [{ axis: 'x', at: 100 }] });
    expect(edition.pages[0]?.guides).toEqual([{ axis: 'x', at: 100 }]);
    await expect(set.execute({ ...s.ref, guides: [{ axis: 'y', at: 999 }] })).rejects.toBeInstanceOf(
      LayoutError,
    );
    // Other page content survives a guides change.
    expect((await s.editions.find(EDITION))?.pages[0]?.layout).toBeDefined();
  });
});

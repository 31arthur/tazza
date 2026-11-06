import { InMemoryEditionRepository, SequentialIds } from '../testing/fakes';
import { GetOrCreateEdition } from '../usecases/edition/GetOrCreateEdition';
import { AddObject } from '../usecases/objects/AddObject';
import { AlignObject } from '../usecases/objects/AlignObject';
import { DuplicateObject } from '../usecases/objects/DuplicateObject';
import { RemoveObject } from '../usecases/objects/RemoveObject';
import { ReorderObject } from '../usecases/objects/ReorderObject';
import { UpdateObject } from '../usecases/objects/UpdateObject';
import { LayoutError } from '../errors/DomainError';
import { GRID, liveRectMm } from '../services/PageGeometry';
import {
  alignPosition,
  applyObjectPatch,
  createObject,
  normalizeAngle,
  reorderObjects,
  type PageObject,
} from './objects';
import { snapEdge, snapMove, snapTargets, snapValue } from './snapping';
import { paintColor } from './style';

const EDITION = '2026-11-07';

const obj = (id: string, x = 0, y = 0, w = 10, h = 10): PageObject => ({
  ...(createObject('rect', id, 1) as PageObject),
  x,
  y,
  w,
  h,
});

describe('object model', () => {
  it('creates every tool centred in the live area', () => {
    const live = liveRectMm(1);
    for (const tool of ['text', 'rect', 'ellipse', 'line', 'image'] as const) {
      const o = createObject(tool, 'a', 1);
      expect(o.x + o.w / 2).toBeCloseTo(live.x + live.w / 2);
      expect(o.y + o.h / 2).toBeCloseTo(live.y + live.h / 2);
    }
  });

  it('keeps sizes, angles and type sizes within limits', () => {
    const text = createObject('text', 't', 1);
    const patched = applyObjectPatch(text, { w: -5, h: 0, rotation: 190, fontSize: 1000 });
    expect(patched.w).toBeGreaterThanOrEqual(1);
    expect(patched.h).toBeGreaterThanOrEqual(1);
    expect(patched.rotation).toBe(-170);
    expect(patched.kind === 'text' && patched.fontSize).toBe(300);
  });

  it('never changes an object kind or id through a patch', () => {
    const rect = createObject('rect', 'r', 1);
    const patched = applyObjectPatch(rect, { id: 'other', kind: 'text' } as never);
    expect(patched.id).toBe('r');
    expect(patched.kind).toBe('shape');
  });

  it('normalises angles into (-180, 180]', () => {
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(-180)).toBe(180);
    expect(normalizeAngle(270)).toBe(-90);
  });

  it('reorders by stacking position', () => {
    const list = [obj('a'), obj('b'), obj('c')];
    const ids = (o: PageObject[]) => o.map((x) => x.id).join('');
    expect(ids(reorderObjects(list, 'a', 'front'))).toBe('bca');
    expect(ids(reorderObjects(list, 'c', 'back'))).toBe('cab');
    expect(ids(reorderObjects(list, 'b', 'forward'))).toBe('acb');
    expect(ids(reorderObjects(list, 'b', 'backward'))).toBe('bac');
    expect(ids(reorderObjects(list, 'c', 'forward'))).toBe('abc');
    expect(ids(reorderObjects(list, 'zzz', 'front'))).toBe('abc');
  });

  it('aligns to a reference rectangle', () => {
    const rect = { x: 50, y: 50, w: 20, h: 10 };
    const ref = { x: 0, y: 0, w: 100, h: 200 };
    expect(alignPosition(rect, 'left', ref)).toEqual({ x: 0 });
    expect(alignPosition(rect, 'centerH', ref)).toEqual({ x: 40 });
    expect(alignPosition(rect, 'right', ref)).toEqual({ x: 80 });
    expect(alignPosition(rect, 'top', ref)).toEqual({ y: 0 });
    expect(alignPosition(rect, 'middleV', ref)).toEqual({ y: 95 });
    expect(alignPosition(rect, 'bottom', ref)).toEqual({ y: 190 });
  });

  it('maps paints to colours', () => {
    expect(paintColor('none')).toBeUndefined();
    expect(paintColor('white')).toBe('#ffffff');
    expect(paintColor('red')).toBe('#c8102e');
    expect(paintColor('tint-yellow')).toBe('#fff3bf');
  });
});

describe('snapping', () => {
  it('snaps to the margin, a column edge and the page centre', () => {
    const t = snapTargets(2, []);
    const live = liveRectMm(2);

    const toMargin = snapMove({ x: live.x + 1.2, y: 100, w: 30, h: 20 }, t, 2);
    expect(toMargin.x).toBeCloseTo(live.x);
    expect(toMargin.guides).toContainEqual({ axis: 'x', at: live.x });

    const toCentre = snapMove({ x: GRID.pageWidthMm / 2 - 15 + 1, y: 100, w: 30, h: 20 }, t, 2);
    expect(toCentre.x + 15).toBeCloseTo(GRID.pageWidthMm / 2);
  });

  it('does not snap beyond the threshold', () => {
    const t = snapTargets(2, []);
    const far = snapMove({ x: 31.3, y: 111.1, w: 7, h: 7 }, t, 0.5);
    expect(far.x).toBe(31.3);
    expect(far.guides.every((g) => g.axis !== 'x' || g.at !== far.x)).toBe(true);
  });

  it('snaps to other objects and ignores hidden ones', () => {
    const other = { ...obj('o', 100, 150, 20, 20) };
    const t = snapTargets(2, [other]);
    expect(snapMove({ x: 101, y: 0, w: 10, h: 10 }, t, 2).x).toBe(100);

    const hidden = { ...other, hidden: true };
    const t2 = snapTargets(2, [hidden]);
    expect(snapMove({ x: 101, y: 0, w: 10, h: 10 }, t2, 0.4).x).toBe(101);
  });

  it('snaps a single dragged edge', () => {
    expect(snapValue([9.8], [10, 50], 0.5)).toEqual({ delta: expect.closeTo(0.2), at: 10 });
    expect(snapEdge(49.7, [50], 0.5)).toEqual({ value: 50, guide: 50 });
    expect(snapEdge(40, [50], 0.5)).toEqual({ value: 40 });
  });
});

describe('object use cases', () => {
  const setup = async () => {
    const editions = new InMemoryEditionRepository();
    const ids = new SequentialIds();
    await new GetOrCreateEdition(editions, ids).execute({ editionId: EDITION });
    const ref = { editionId: EDITION, pageNumber: 1 };
    return {
      editions,
      ref,
      add: new AddObject(editions, ids),
      update: new UpdateObject(editions),
      remove: new RemoveObject(editions),
      duplicate: new DuplicateObject(editions, ids),
      reorder: new ReorderObject(editions),
      align: new AlignObject(editions),
      objects: async () => (await editions.find(EDITION))?.pages[0]?.objects ?? [],
    };
  };

  it('adds, updates, duplicates and removes objects', async () => {
    const s = await setup();
    const { objectId } = await s.add.execute({ ...s.ref, tool: 'text' });
    await s.update.execute({ ...s.ref, objectId, patch: { text: 'రేపు చర్చలు', x: 20 } });
    const [first] = await s.objects();
    expect(first?.kind === 'text' && first.text).toBe('రేపు చర్చలు');
    expect(first?.x).toBe(20);

    const copy = await s.duplicate.execute({ ...s.ref, objectId });
    expect(await s.objects()).toHaveLength(2);
    expect((await s.objects())[1]?.id).toBe(copy.objectId);
    expect((await s.objects())[1]?.x).toBe(25);

    await s.remove.execute({ ...s.ref, objectId });
    expect((await s.objects()).map((o) => o.id)).toEqual([copy.objectId]);
  });

  it('rejects changes to objects that do not exist', async () => {
    const s = await setup();
    await expect(
      s.update.execute({ ...s.ref, objectId: 'nope', patch: { x: 1 } }),
    ).rejects.toBeInstanceOf(LayoutError);
  });

  it('reorders and aligns', async () => {
    const s = await setup();
    const a = await s.add.execute({ ...s.ref, tool: 'rect' });
    const b = await s.add.execute({ ...s.ref, tool: 'ellipse' });
    await s.reorder.execute({ ...s.ref, objectId: a.objectId, op: 'front' });
    expect((await s.objects()).map((o) => o.id)).toEqual([b.objectId, a.objectId]);

    await s.align.execute({ ...s.ref, objectId: a.objectId, mode: 'left', to: 'page' });
    expect((await s.objects()).find((o) => o.id === a.objectId)?.x).toBe(0);
    await s.align.execute({ ...s.ref, objectId: a.objectId, mode: 'left', to: 'live' });
    expect((await s.objects()).find((o) => o.id === a.objectId)?.x).toBe(GRID.marginXMm);
  });
});

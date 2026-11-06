import type { Article } from '../../entities/Article';
import type { Asset } from '../../entities/Asset';
import { DEFAULT_ADJUST, effectivePpi, isDefaultAdjust, resolveAdjust } from '../../entities/ImageAdjust';
import { LayoutError } from '../../errors/DomainError';
import { createObject } from '../../layout/objects';
import { makeLeaf } from '../../layout/tree';
import { normalizeTags, searchAssets, tagCounts } from '../../services/assetSearch';
import { countAssetUsage } from '../../services/assetUsage';
import {
  FixedClock,
  InMemoryArticleRepository,
  InMemoryAssetRepository,
  InMemoryEditionRepository,
  SequentialIds,
} from '../../testing/fakes';
import { DeleteAsset } from './DeleteAsset';
import { ListAssets } from './ListAssets';
import { SaveAsset } from './SaveAsset';
import { UpdateAssetMeta } from './UpdateAssetMeta';

const photo = (id: string, extra: Partial<Asset> = {}): Asset => ({
  id,
  mimeType: 'image/jpeg',
  widthPx: 3000,
  heightPx: 2000,
  byteSize: 1,
  ...extra,
});

describe('image adjustments', () => {
  it('fills in defaults and keeps values in range', () => {
    expect(resolveAdjust(undefined)).toEqual(DEFAULT_ADJUST);
    const a = resolveAdjust({ focalX: 2, focalY: -1, zoom: 99, brightness: 0, contrast: 5, rotation: 450 as never });
    expect(a).toMatchObject({ focalX: 1, focalY: 0, zoom: 5, brightness: 0.4, contrast: 1.8, rotation: 90 });
    expect(resolveAdjust({ rotation: -90 as never }).rotation).toBe(270);
    expect(resolveAdjust({ focalX: Number.NaN }).focalX).toBe(0);
  });

  it('knows when nothing has been changed', () => {
    expect(isDefaultAdjust(undefined)).toBe(true);
    expect(isDefaultAdjust({ zoom: 1 })).toBe(true);
    expect(isDefaultAdjust({ greyscale: true })).toBe(false);
    expect(isDefaultAdjust({ zoom: 2 })).toBe(false);
  });

  it('works out the printed resolution of a cropped photo', () => {
    const image = { widthPx: 3000, heightPx: 2000 };
    // 3000 px across 100 mm is 762 ppi; the frame is filled by width.
    expect(effectivePpi(image, { w: 100, h: 66 }, undefined)).toBeCloseTo(762, 0);
    // Zooming in 3x spreads fewer pixels over the same frame.
    expect(effectivePpi(image, { w: 100, h: 66 }, { zoom: 3 })).toBeCloseTo(254, 0);
    // A tall frame is filled by height, so the picture is cropped at the sides.
    expect(effectivePpi(image, { w: 50, h: 200 }, undefined)).toBeCloseTo(254, 0);
    // A quarter turn swaps the picture's sides.
    const turned = effectivePpi(image, { w: 50, h: 200 }, { rotation: 90 });
    expect(turned).toBeCloseTo(381, 0);
    expect(effectivePpi(image, { w: 0, h: 10 }, undefined)).toBe(0);
  });
});

describe('searching the library', () => {
  const library = [
    photo('1', { name: 'Metro-bridge.jpg', credit: 'Ravi Kumar', tags: ['metro', 'city'] }),
    photo('2', { name: 'Cricket-final.jpg', caption: 'The captain lifts the trophy', tags: ['sports'] }),
    photo('3', { name: 'తెలుగు-సంక్రాంతి.jpg', credit: 'ఫొటో డెస్క్', tags: ['పండుగ', 'city'] }),
  ];

  it('matches every word in the name, credit, caption or tags, in any case', () => {
    expect(searchAssets(library, { text: 'ravi' }).map((a) => a.id)).toEqual(['1']);
    expect(searchAssets(library, { text: 'CAPTAIN trophy' }).map((a) => a.id)).toEqual(['2']);
    expect(searchAssets(library, { text: 'captain metro' })).toEqual([]);
    expect(searchAssets(library, { text: 'సంక్రాంతి' }).map((a) => a.id)).toEqual(['3']);
    expect(searchAssets(library, {})).toHaveLength(3);
  });

  it('filters by tag', () => {
    expect(searchAssets(library, { tag: 'CITY' }).map((a) => a.id)).toEqual(['1', '3']);
    expect(searchAssets(library, { tag: 'city', text: 'metro' }).map((a) => a.id)).toEqual(['1']);
  });

  it('counts tags and tidies a tag list', () => {
    expect(tagCounts(library)[0]).toEqual({ tag: 'city', count: 2 });
    expect(normalizeTags([' Metro ', 'metro', '', 'City', '  '])).toEqual(['Metro', 'City']);
  });
});

describe('where photos are used', () => {
  it('counts story images, photo boxes, image frames and master objects', () => {
    const article: Article = {
      id: 'a',
      editionId: 'e',
      headline: '',
      subHeadline: '',
      byline: '',
      body: [
        { type: 'image', assetId: 'p1', caption: '' },
        { type: 'image', assetId: 'p1', caption: '' },
      ],
      createdAt: 1,
      updatedAt: 1,
    };
    const frame = { ...createObject('image', 'o1', 1), assetId: 'p2' } as ReturnType<typeof createObject>;
    const edition = {
      id: 'e',
      pages: [
        {
          number: 1,
          layout: { ...makeLeaf('t'), element: { type: 'photo' as const, assetId: 'p3', caption: '' } },
          objects: [frame],
        },
      ],
      masters: [{ id: 'm', name: 'M', objects: [frame] }],
    };
    const usage = countAssetUsage([article], [edition]);
    expect(usage.get('p1')).toBe(2);
    expect(usage.get('p2')).toBe(2); // page and master
    expect(usage.get('p3')).toBe(1);
    expect(usage.get('nope')).toBeUndefined();
  });
});

describe('asset use cases', () => {
  const setup = () => {
    const assets = new InMemoryAssetRepository();
    const articles = new InMemoryArticleRepository();
    const editions = new InMemoryEditionRepository();
    return { assets, articles, editions, ids: new SequentialIds(), clock: new FixedClock() };
  };
  const blob = () => new Blob(['x'], { type: 'image/png' });

  it('saves a photo with its name and time, and lists newest first with usage', async () => {
    const s = setup();
    const save = new SaveAsset(s.assets, s.ids, s.clock);
    const first = await save.execute({ blob: blob(), widthPx: 10, heightPx: 10, name: '  a.png ' });
    const second = await save.execute({ blob: blob(), widthPx: 10, heightPx: 10 });
    expect(first.name).toBe('a.png');
    expect(second.name).toBeUndefined();

    await s.articles.save({
      id: 'x',
      editionId: 'e',
      headline: '',
      subHeadline: '',
      byline: '',
      body: [{ type: 'image', assetId: first.id, caption: '' }],
      createdAt: 1,
      updatedAt: 1,
    });
    const list = await new ListAssets(s.assets, s.articles, s.editions).execute();
    expect(list.map((i) => i.asset.id)).toEqual([second.id, first.id]);
    expect(list.map((i) => i.usage)).toEqual([0, 1]);
  });

  it('edits metadata and normalises it', async () => {
    const s = setup();
    const saved = await new SaveAsset(s.assets, s.ids, s.clock).execute({ blob: blob(), widthPx: 1, heightPx: 1 });
    await new UpdateAssetMeta(s.assets).execute({
      id: saved.id,
      meta: { credit: '  Ravi  ', tags: ['Metro', 'metro', ' '], name: ' Bridge ' },
    });
    const [asset] = await s.assets.list();
    expect(asset).toMatchObject({ credit: 'Ravi', tags: ['Metro'], name: 'Bridge' });
  });

  it('refuses to delete a photo that is in use, but deletes an unused one', async () => {
    const s = setup();
    const save = new SaveAsset(s.assets, s.ids, s.clock);
    const used = await save.execute({ blob: blob(), widthPx: 1, heightPx: 1 });
    const spare = await save.execute({ blob: blob(), widthPx: 1, heightPx: 1 });
    await s.editions.save({
      id: 'e',
      pages: [{ number: 1, layout: { ...makeLeaf('t'), element: { type: 'photo', assetId: used.id, caption: '' } } }],
    });
    const remove = new DeleteAsset(s.assets, s.articles, s.editions);
    await expect(remove.execute({ id: used.id })).rejects.toBeInstanceOf(LayoutError);
    await remove.execute({ id: spare.id });
    expect((await s.assets.list()).map((a) => a.id)).toEqual([used.id]);
  });
});

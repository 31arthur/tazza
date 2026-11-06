import type { Article } from '../../entities/Article';
import type { Edition } from '../../entities/Edition';
import type { EditionBundle } from '../../entities/EditionBundle';
import { BundleError } from '../../errors/DomainError';
import type { BundleCodec } from '../../ports/services/BundleCodec';
import { makeLeaf } from '../../layout/tree';
import { assetIdsUsedBy } from '../../services/assetUsage';
import {
  InMemoryArticleRepository,
  InMemoryAssetRepository,
  InMemoryEditionRepository,
} from '../../testing/fakes';
import { ExportEditionBundle } from './ExportEditionBundle';
import { ImportEditionBundle } from './ImportEditionBundle';

/** Keeps the bundle in memory: the real codec writes JSON, which is the data layer's job. */
class MemoryCodec implements BundleCodec {
  private readonly store = new Map<Blob, EditionBundle>();
  async encode(bundle: EditionBundle): Promise<Blob> {
    const file = new Blob(['x']);
    this.store.set(file, bundle);
    return file;
  }
  async decode(file: Blob): Promise<EditionBundle> {
    const found = this.store.get(file);
    if (!found) throw new BundleError('not a bundle');
    return found;
  }
}

const article = (id: string, assetId?: string): Article => ({
  id,
  editionId: 'e1',
  headline: id,
  subHeadline: '',
  byline: '',
  body: assetId ? [{ type: 'image', assetId, caption: '' }] : [],
  createdAt: 1,
  updatedAt: 1,
});

const setup = async () => {
  const editions = new InMemoryEditionRepository();
  const articles = new InMemoryArticleRepository();
  const assets = new InMemoryAssetRepository();
  const meta = (id: string) => ({ id, mimeType: 'image/png', widthPx: 1, heightPx: 1, byteSize: 1 });
  await assets.put(meta('in-story'), new Blob(['a']));
  await assets.put(meta('in-tile'), new Blob(['b']));
  await assets.put(meta('unused'), new Blob(['c']));
  const edition: Edition = {
    id: 'e1',
    pages: [
      {
        number: 1,
        layout: { ...makeLeaf('t'), element: { type: 'photo', assetId: 'in-tile', caption: '' } },
      },
    ],
  };
  await editions.save(edition);
  await articles.save(article('a1', 'in-story'));
  await articles.save({ ...article('other'), editionId: 'e2' });
  return { editions, articles, assets, edition, codec: new MemoryCodec() };
};

describe('edition bundle', () => {
  it('finds the photos an edition needs', async () => {
    const { edition } = await setup();
    expect(assetIdsUsedBy(edition, [article('a1', 'in-story')]).sort()).toEqual(['in-story', 'in-tile']);
  });

  it('packs the edition, its own stories and only the photos it uses', async () => {
    const s = await setup();
    const exported = await new ExportEditionBundle(s.editions, s.articles, s.assets, s.codec).execute({
      editionId: 'e1',
    });
    expect(exported.fileName).toBe('tazza-e1.tazza.json');
    const bundle = await s.codec.decode(exported.blob);
    expect(bundle.articles.map((a) => a.id)).toEqual(['a1']);
    expect(bundle.assets.map((a) => a.asset.id).sort()).toEqual(['in-story', 'in-tile']);
  });

  it('refuses an edition that does not exist', async () => {
    const s = await setup();
    await expect(
      new ExportEditionBundle(s.editions, s.articles, s.assets, s.codec).execute({ editionId: 'nope' }),
    ).rejects.toThrow('not found');
  });

  it('restores a bundle into empty storage, and again without duplicating', async () => {
    const s = await setup();
    const { blob } = await new ExportEditionBundle(s.editions, s.articles, s.assets, s.codec).execute({
      editionId: 'e1',
    });
    const editions = new InMemoryEditionRepository();
    const articles = new InMemoryArticleRepository();
    const assets = new InMemoryAssetRepository();
    const restore = new ImportEditionBundle(editions, articles, assets, s.codec);

    expect(await restore.execute({ file: blob })).toEqual({ editionId: 'e1', articleCount: 1, assetCount: 2 });
    await restore.execute({ file: blob });
    expect(editions.items.get('e1')).toEqual(s.edition);
    expect(articles.items.size).toBe(1);
    expect(assets.items.size).toBe(2);
  });

  it('rejects a file that is not a bundle', async () => {
    const s = await setup();
    await expect(
      new ImportEditionBundle(s.editions, s.articles, s.assets, s.codec).execute({ file: new Blob(['junk']) }),
    ).rejects.toBeInstanceOf(BundleError);
  });
});

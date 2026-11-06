import { GetOrCreateEdition } from '../usecases/edition/GetOrCreateEdition';
import { UpdateMasthead } from '../usecases/edition/UpdateMasthead';
import { InMemoryEditionRepository, SequentialIds } from '../testing/fakes';
import { DEFAULT_MASTHEAD, ROLE_PRESETS, resolveMasthead, resolveStyle } from './style';
import { findLeaf, makeLeaf, setLeafStyle } from './tree';

describe('tile styles', () => {
  it('starts from the role preset and applies overrides on top', () => {
    const banner = makeLeaf('a', 'banner');
    expect(resolveStyle(banner)).toEqual(ROLE_PRESETS.banner);
    expect(resolveStyle(banner).headlineOverPhoto).toBe(true);

    const tinted = setLeafStyle(banner, 'a', { tint: 'pink', kicker: 'BREAKING' });
    const leaf = findLeaf(tinted, 'a');
    expect(leaf && resolveStyle(leaf)).toMatchObject({
      tint: 'pink',
      kicker: 'BREAKING',
      headlineOverPhoto: true,
    });
  });

  it('merges successive overrides and resets with null', () => {
    let tree = setLeafStyle(makeLeaf('a', 'story'), 'a', { accent: 'red' });
    tree = setLeafStyle(tree, 'a', { frame: 'box' });
    const leaf = findLeaf(tree, 'a');
    expect(leaf?.style).toEqual({ accent: 'red', frame: 'box' });

    const reset = findLeaf(setLeafStyle(tree, 'a', null), 'a');
    expect(reset && resolveStyle(reset)).toEqual(ROLE_PRESETS.story);
  });

  it('only changes the tile it was asked to', () => {
    const tree = setLeafStyle(makeLeaf('a'), 'other', { accent: 'green' });
    expect(findLeaf(tree, 'a')?.style).toBeUndefined();
  });
});

describe('masthead', () => {
  it('falls back to the defaults and keeps saved overrides', async () => {
    const editions = new InMemoryEditionRepository();
    const ids = new SequentialIds();
    await new GetOrCreateEdition(editions, ids).execute({ editionId: '2026-11-07' });

    expect(resolveMasthead(undefined)).toEqual(DEFAULT_MASTHEAD);

    const updated = await new UpdateMasthead(editions).execute({
      editionId: '2026-11-07',
      masthead: { title: 'వార్త', color: 'red' },
    });
    const again = await new UpdateMasthead(editions).execute({
      editionId: '2026-11-07',
      masthead: { leftEar: 'Headline\nText' },
    });
    expect(updated.masthead).toEqual({ title: 'వార్త', color: 'red' });
    expect(resolveMasthead(again.masthead)).toMatchObject({
      title: 'వార్త',
      color: 'red',
      leftEar: 'Headline\nText',
      titleEn: DEFAULT_MASTHEAD.titleEn,
    });
  });
});

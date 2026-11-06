import { NotFoundError } from '../../errors/DomainError';
import { InMemoryEditionRepository, SequentialIds } from '../../testing/fakes';
import { GetOrCreateEdition } from './GetOrCreateEdition';
import { RestoreEdition } from './RestoreEdition';
import { UpdateMasthead } from './UpdateMasthead';

describe('RestoreEdition', () => {
  it('puts an earlier snapshot back', async () => {
    const editions = new InMemoryEditionRepository();
    const original = await new GetOrCreateEdition(editions, new SequentialIds()).execute({
      editionId: '2026-11-07',
    });
    await new UpdateMasthead(editions).execute({
      editionId: '2026-11-07',
      masthead: { title: 'వార్త' },
    });
    expect((await editions.find('2026-11-07'))?.masthead?.title).toBe('వార్త');

    await new RestoreEdition(editions).execute({ edition: original });
    expect((await editions.find('2026-11-07'))?.masthead).toBeUndefined();
  });

  it('refuses an edition that does not exist', async () => {
    const editions = new InMemoryEditionRepository();
    await expect(
      new RestoreEdition(editions).execute({ edition: { id: 'nope', pages: [] } }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

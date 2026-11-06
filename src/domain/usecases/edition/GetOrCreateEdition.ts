import { newEdition, type Edition } from '../../entities/Edition';
import { buildTemplate } from '../../layout/templates';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { LibraryRepository } from '../../ports/repositories/LibraryRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';

export class GetOrCreateEdition {
  constructor(
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
    /** When given, a saved brand kit becomes the masthead of every new edition. */
    private readonly library?: LibraryRepository,
  ) {}

  async execute({ editionId }: { editionId: string }): Promise<Edition> {
    const existing = await this.editions.find(editionId);
    if (existing) return existing;
    const kit = (await this.library?.list())?.find((i) => i.kind === 'brandKit');
    const base = newEdition(editionId, buildTemplate('front', this.ids));
    const created = kit?.kind === 'brandKit' ? { ...base, masthead: kit.masthead } : base;
    await this.editions.save(created);
    return created;
  }
}

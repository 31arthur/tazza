import type { LibraryItem } from '../../entities/LibraryItem';
import { NotFoundError } from '../../errors/DomainError';
import { pageToTemplate } from '../../layout/template';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { LibraryRepository } from '../../ports/repositories/LibraryRepository';
import type { Clock } from '../../ports/services/Clock';
import type { IdGenerator } from '../../ports/services/IdGenerator';

/** Saves a whole edition's pages, masters and masthead (not its stories) as a template. */
export class SaveEditionTemplate {
  constructor(
    private readonly editions: EditionRepository,
    private readonly library: LibraryRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: { editionId: string; name: string }): Promise<LibraryItem> {
    const edition = await this.editions.find(input.editionId);
    if (!edition) throw new NotFoundError(`Edition ${input.editionId} not found`);
    const item: LibraryItem = {
      kind: 'editionTemplate',
      id: this.ids.next(),
      name: input.name.trim() || 'Edition template',
      createdAt: this.clock.now(),
      pages: edition.pages.map(pageToTemplate),
      masters: edition.masters ?? [],
      ...(edition.masthead && { masthead: edition.masthead }),
    };
    await this.library.save(item);
    return item;
  }
}

import { findPage } from '../../entities/Edition';
import type { LibraryItem } from '../../entities/LibraryItem';
import { NotFoundError } from '../../errors/DomainError';
import { pageToTemplate } from '../../layout/template';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { LibraryRepository } from '../../ports/repositories/LibraryRepository';
import type { Clock } from '../../ports/services/Clock';
import type { IdGenerator } from '../../ports/services/IdGenerator';

/** Saves a page's structure and objects (not its stories) so any page can start from it. */
export class SavePageTemplate {
  constructor(
    private readonly editions: EditionRepository,
    private readonly library: LibraryRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    editionId: string;
    pageNumber: number;
    name: string;
  }): Promise<LibraryItem> {
    const edition = await this.editions.find(input.editionId);
    if (!edition) throw new NotFoundError(`Edition ${input.editionId} not found`);
    const item: LibraryItem = {
      kind: 'pageTemplate',
      id: this.ids.next(),
      name: input.name.trim() || 'Page template',
      createdAt: this.clock.now(),
      page: pageToTemplate(findPage(edition, input.pageNumber)),
    };
    await this.library.save(item);
    return item;
  }
}

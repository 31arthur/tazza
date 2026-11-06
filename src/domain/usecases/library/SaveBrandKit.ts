import { BRAND_KIT_ID, type LibraryItem } from '../../entities/LibraryItem';
import type { Masthead } from '../../layout/style';
import type { LibraryRepository } from '../../ports/repositories/LibraryRepository';
import type { Clock } from '../../ports/services/Clock';

/** Saves the publication's masthead as the default for every new edition. */
export class SaveBrandKit {
  constructor(
    private readonly library: LibraryRepository,
    private readonly clock: Clock,
  ) {}

  async execute({ masthead }: { masthead: Partial<Masthead> }): Promise<LibraryItem> {
    const item: LibraryItem = {
      kind: 'brandKit',
      id: BRAND_KIT_ID,
      name: 'Brand kit',
      createdAt: this.clock.now(),
      masthead,
    };
    await this.library.save(item);
    return item;
  }
}

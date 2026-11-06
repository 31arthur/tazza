import type { LibraryItem } from '../../entities/LibraryItem';
import type { LeafStyle } from '../../layout/style';
import type { SlotRole } from '../../layout/tree';
import type { LibraryRepository } from '../../ports/repositories/LibraryRepository';
import type { Clock } from '../../ports/services/Clock';
import type { IdGenerator } from '../../ports/services/IdGenerator';

/** Saves a tile's role and style under a name, like a paragraph style in a layout tool. */
export class SaveTileStyle {
  constructor(
    private readonly library: LibraryRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    name: string;
    role: SlotRole;
    style: Partial<LeafStyle>;
  }): Promise<LibraryItem> {
    const item: LibraryItem = {
      kind: 'tileStyle',
      id: this.ids.next(),
      name: input.name.trim() || 'Style',
      createdAt: this.clock.now(),
      role: input.role,
      style: input.style,
    };
    await this.library.save(item);
    return item;
  }
}

import type { LibraryRepository } from '../../ports/repositories/LibraryRepository';

export class DeleteLibraryItem {
  constructor(private readonly library: LibraryRepository) {}

  execute({ id }: { id: string }): Promise<void> {
    return this.library.delete(id);
  }
}

import type { LibraryItem } from '../../entities/LibraryItem';
import type { LibraryRepository } from '../../ports/repositories/LibraryRepository';

export class ListLibrary {
  constructor(private readonly library: LibraryRepository) {}

  /** Everything saved for reuse, newest first. */
  async execute(): Promise<LibraryItem[]> {
    const items = await this.library.list();
    return [...items].sort((a, b) => b.createdAt - a.createdAt);
  }
}

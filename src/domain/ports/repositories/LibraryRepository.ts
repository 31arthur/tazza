import type { LibraryItem } from '../../entities/LibraryItem';

export interface LibraryRepository {
  /** Newest first. */
  list(): Promise<LibraryItem[]>;
  save(item: LibraryItem): Promise<void>;
  delete(id: string): Promise<void>;
}

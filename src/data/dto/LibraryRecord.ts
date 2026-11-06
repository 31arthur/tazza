import type { LibraryItem } from '@domain/entities/LibraryItem';

/** Persisted shape of a library item. `schema` lets future migrations upgrade old rows. */
export type LibraryRecord = LibraryItem & { schema: 1 };

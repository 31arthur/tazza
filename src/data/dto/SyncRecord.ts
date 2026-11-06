import type { SyncBase } from '@domain/entities/Sync';

/** One row: the server position and the last-agreed copy of every shared document. */
export interface SyncRecord {
  id: string;
  cursor: number;
  bases: Record<string, SyncBase>;
}

/** What can be shared between computers. Library templates and the brand kit stay local. */
export type SyncKind = 'article' | 'edition' | 'asset';

export const syncKey = (kind: SyncKind, id: string): string => `${kind}:${id}`;

export const parseSyncKey = (key: string): { kind: SyncKind; id: string } => {
  const at = key.indexOf(':');
  return { kind: key.slice(0, at) as SyncKind, id: key.slice(at + 1) };
};

/** One document as the shared server holds it. */
export interface RemoteChange {
  readonly kind: SyncKind;
  readonly id: string;
  /** Grows with every change on the server; used to notice that someone else got there first. */
  readonly rev: number;
  readonly deleted: boolean;
  /** The article, edition or photo details as plain data; absent for a deletion. */
  readonly doc?: unknown;
}

export interface PullResult {
  /** Pass this back next time to receive only newer changes. */
  readonly cursor: number;
  readonly changes: readonly RemoteChange[];
}

export interface PushRequest {
  readonly kind: SyncKind;
  readonly id: string;
  /** The server revision this change was made on top of (0 for a new document). */
  readonly ifRev: number;
  readonly deleted: boolean;
  readonly doc?: unknown;
}

export type PushResult =
  | { readonly ok: true; readonly rev: number }
  | { readonly ok: false; readonly conflict: true };

/** What was last agreed with the server for one document: the revision and its content. */
export interface SyncBase {
  readonly rev: number;
  /** Null when the document is known to be deleted. */
  readonly doc: unknown;
}

export interface SyncState {
  readonly cursor: number;
  readonly bases: Readonly<Record<string, SyncBase>>;
}

export const EMPTY_SYNC_STATE: SyncState = { cursor: 0, bases: {} };

export interface SyncSettings {
  readonly enabled: boolean;
  readonly serverUrl: string;
  readonly token: string;
}

export const DEFAULT_SYNC_SETTINGS: SyncSettings = { enabled: false, serverUrl: '', token: '' };

/** What a sync run did, for the status line. */
export interface SyncReport {
  readonly pulled: number;
  readonly pushed: number;
  /** Things changed on both computers in a way that could not be combined; this computer's version was kept. */
  readonly conflicts: readonly string[];
}

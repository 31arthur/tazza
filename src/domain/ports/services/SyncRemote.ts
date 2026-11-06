import type { PullResult, PushRequest, PushResult, SyncKind } from '../../entities/Sync';

/** The shared server. Every method may throw when the server cannot be reached. */
export interface SyncRemote {
  pull(since: number): Promise<PullResult>;
  /** Replies `conflict` when `ifRev` is no longer the server's revision. */
  push(request: PushRequest): Promise<PushResult>;
  putAsset(id: string, blob: Blob): Promise<void>;
  getAsset(id: string): Promise<Blob | undefined>;
  /** Used for the "does this server work" check. Resolves when the address and token are right. */
  ping(): Promise<void>;
}

export type { SyncKind };

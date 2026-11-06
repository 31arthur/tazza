import type { SyncRemote } from '../../ports/services/SyncRemote';

/** Checks that the server answers and accepts the token. */
export class TestSyncConnection {
  constructor(private readonly remote: SyncRemote) {}

  async execute(): Promise<void> {
    await this.remote.ping();
  }
}

import type { SyncSettings } from '../../entities/Sync';
import type { SyncStateRepository } from '../../ports/repositories/SyncStateRepository';

export class GetSyncSettings {
  constructor(private readonly state: SyncStateRepository) {}

  execute(): SyncSettings {
    return this.state.loadSettings();
  }
}

import type { SyncSettings, SyncState } from '../../entities/Sync';

/** What this computer remembers about the last sync, and how it is set up. */
export interface SyncStateRepository {
  loadState(): Promise<SyncState>;
  saveState(state: SyncState): Promise<void>;
  loadSettings(): SyncSettings;
  saveSettings(settings: SyncSettings): void;
}

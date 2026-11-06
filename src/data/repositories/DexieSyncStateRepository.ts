import {
  DEFAULT_SYNC_SETTINGS,
  EMPTY_SYNC_STATE,
  type SyncSettings,
  type SyncState,
} from '@domain/entities/Sync';
import type { SyncStateRepository } from '@domain/ports/repositories/SyncStateRepository';
import type { TazzaDb } from '../datasources/TazzaDb';

const SETTINGS_KEY = 'tazza.sync';
const STATE_ID = 'state';

/** The last-sync record lives in the database; the server address and token in local storage. */
export class DexieSyncStateRepository implements SyncStateRepository {
  constructor(private readonly db: TazzaDb) {}

  async loadState(): Promise<SyncState> {
    const row = await this.db.sync.get(STATE_ID);
    return row ? { cursor: row.cursor, bases: row.bases } : EMPTY_SYNC_STATE;
  }

  async saveState(state: SyncState): Promise<void> {
    await this.db.sync.put({ id: STATE_ID, cursor: state.cursor, bases: { ...state.bases } });
  }

  loadSettings(): SyncSettings {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
      if (typeof raw !== 'object' || raw === null) return DEFAULT_SYNC_SETTINGS;
      const r = raw as Record<string, unknown>;
      return {
        enabled: r['enabled'] === true,
        serverUrl: typeof r['serverUrl'] === 'string' ? r['serverUrl'] : '',
        token: typeof r['token'] === 'string' ? r['token'] : '',
      };
    } catch {
      return DEFAULT_SYNC_SETTINGS;
    }
  }

  saveSettings(settings: SyncSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
}

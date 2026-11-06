import { create } from 'zustand';
import { DEFAULT_SYNC_SETTINGS, type SyncReport, type SyncSettings } from '@domain/entities/Sync';

export type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncUiState {
  settings: SyncSettings;
  status: SyncStatus;
  lastAt: number | undefined;
  message: string | undefined;
  /** Parts changed on two computers at once that could not be combined (this computer's kept). */
  conflicts: readonly string[];
  setSettings(settings: SyncSettings): void;
  begin(): void;
  succeed(report: SyncReport): void;
  fail(message: string): void;
  reset(): void;
}

/** What the sync indicator shows. The sync itself runs in the SyncNow use case. */
export const useSyncStore = create<SyncUiState>((set) => ({
  settings: DEFAULT_SYNC_SETTINGS,
  status: 'idle',
  lastAt: undefined,
  message: undefined,
  conflicts: [],
  setSettings: (settings) => set({ settings }),
  begin: () => set({ status: 'syncing' }),
  succeed: (report) =>
    set((s) => ({
      status: 'idle',
      lastAt: Date.now(),
      message: undefined,
      conflicts: report.conflicts.length > 0 ? report.conflicts : s.conflicts,
    })),
  fail: (message) => set({ status: 'error', message }),
  reset: () => set({ status: 'idle', message: undefined, conflicts: [], lastAt: undefined }),
}));

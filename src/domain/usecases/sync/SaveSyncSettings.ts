import type { SyncSettings } from '../../entities/Sync';
import { LayoutError } from '../../errors/DomainError';
import type { SyncStateRepository } from '../../ports/repositories/SyncStateRepository';

/** Saves the server address, token and on/off. A blank address cannot be turned on. */
export class SaveSyncSettings {
  constructor(private readonly state: SyncStateRepository) {}

  execute(settings: SyncSettings): SyncSettings {
    const clean: SyncSettings = {
      enabled: settings.enabled,
      serverUrl: settings.serverUrl.trim().replace(/\/+$/, ''),
      token: settings.token.trim(),
    };
    if (clean.enabled && clean.serverUrl === '') {
      throw new LayoutError('Enter the sync server address first.');
    }
    this.state.saveSettings(clean);
    return clean;
  }
}

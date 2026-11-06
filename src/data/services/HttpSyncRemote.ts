import type { PullResult, PushRequest, PushResult, SyncSettings } from '@domain/entities/Sync';
import type { SyncRemote } from '@domain/ports/services/SyncRemote';

/** Talks to the Tazza sync server over HTTP. Settings are read on every call so edits apply at once. */
export class HttpSyncRemote implements SyncRemote {
  constructor(private readonly settings: () => SyncSettings) {}

  private async call(path: string, init: RequestInit = {}): Promise<Response> {
    const { serverUrl, token } = this.settings();
    if (serverUrl === '') throw new Error('No sync server address is set.');
    const headers = new Headers(init.headers);
    if (token !== '') headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${serverUrl}${path}`, { ...init, headers });
    if (response.status === 401) throw new Error('The sync server did not accept the token.');
    return response;
  }

  async ping(): Promise<void> {
    const response = await this.call('/sync/ping');
    if (!response.ok) throw new Error(`The sync server answered ${response.status}.`);
  }

  async pull(since: number): Promise<PullResult> {
    const response = await this.call(`/sync/changes?since=${since}`);
    if (!response.ok) throw new Error(`The sync server answered ${response.status}.`);
    return (await response.json()) as PullResult;
  }

  async push(request: PushRequest): Promise<PushResult> {
    const response = await this.call('/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (response.status === 409) return { ok: false, conflict: true };
    if (!response.ok) throw new Error(`The sync server answered ${response.status}.`);
    const { rev } = (await response.json()) as { rev: number };
    return { ok: true, rev };
  }

  async putAsset(id: string, blob: Blob): Promise<void> {
    const response = await this.call(`/sync/assets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': blob.type || 'application/octet-stream' },
      body: blob,
    });
    if (!response.ok) throw new Error(`The sync server answered ${response.status}.`);
  }

  async getAsset(id: string): Promise<Blob | undefined> {
    const response = await this.call(`/sync/assets/${encodeURIComponent(id)}`);
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`The sync server answered ${response.status}.`);
    return response.blob();
  }
}

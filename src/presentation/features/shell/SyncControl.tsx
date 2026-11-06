import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { SyncSettings } from '@domain/entities/Sync';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useUseCases } from '../../hooks/AppContext';
import { useSyncStore } from '../../state/syncStore';

const POLL_MS = 8000;

/** Runs sync while it is switched on: now, every few seconds, and whenever the window regains focus. */
function useAutoSync(settings: SyncSettings) {
  const { syncNow } = useUseCases();
  const queryClient = useQueryClient();
  const running = useRef(false);
  const { begin, succeed, fail } = useSyncStore();

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    begin();
    try {
      const report = await syncNow.execute();
      succeed(report);
      if (report.pulled > 0) await queryClient.invalidateQueries();
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    } finally {
      running.current = false;
    }
  }, [syncNow, queryClient, begin, succeed, fail]);

  useEffect(() => {
    if (!settings.enabled) return;
    void run();
    const timer = window.setInterval(() => void run(), POLL_MS);
    const onFocus = () => void run();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [settings.enabled, settings.serverUrl, settings.token, run]);

  return run;
}

/** The sync indicator in the top bar and its settings dialog. */
export function SyncControl() {
  const { t } = useTranslation();
  const { getSyncSettings, saveSyncSettings, testSyncConnection } = useUseCases();
  const { settings, setSettings, status, lastAt, message, conflicts, reset } = useSyncStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SyncSettings>(settings);

  useEffect(() => {
    setSettings(getSyncSettings.execute());
  }, [getSyncSettings, setSettings]);

  const syncNow = useAutoSync(settings);

  const save = (next: SyncSettings) => {
    try {
      const saved = saveSyncSettings.execute(next);
      setSettings(saved);
      setDraft(saved);
      if (!saved.enabled) reset();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.generic'));
      return false;
    }
  };

  const test = async () => {
    if (!save({ ...draft, enabled: draft.enabled })) return;
    try {
      await testSyncConnection.execute();
      toast.success(t('sync.testOk'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.generic'));
    }
  };

  const Icon = !settings.enabled
    ? CloudOff
    : status === 'syncing'
      ? Loader2
      : status === 'error'
        ? AlertTriangle
        : Cloud;
  const label = !settings.enabled
    ? t('sync.off')
    : status === 'error'
      ? t('sync.error')
      : status === 'syncing'
        ? t('sync.syncing')
        : t('sync.on');

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        title={message ?? label}
        onClick={() => {
          setDraft(settings);
          setOpen(true);
        }}
      >
        <Icon className={status === 'syncing' && settings.enabled ? 'animate-spin' : undefined} />
        <span className="hidden xl:inline">{label}</span>
        {settings.enabled && conflicts.length > 0 && (
          <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-800">{conflicts.length}</span>
        )}
      </Button>
      {open && (
        <Modal title={t('sync.title')} onClose={() => setOpen(false)} widthClass="max-w-lg">
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">{t('sync.intro')}</p>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('sync.serverUrl')}
              <Input
                value={draft.serverUrl}
                placeholder="http://192.168.1.20:8787"
                onChange={(e) => setDraft({ ...draft, serverUrl: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('sync.token')}
              <Input
                type="password"
                autoComplete="off"
                value={draft.token}
                onChange={(e) => setDraft({ ...draft, token: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />
              {t('sync.enable')}
            </label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void test()}>
                {t('sync.test')}
              </Button>
              <Button
                onClick={() => {
                  if (save(draft) && draft.enabled) void syncNow();
                }}
              >
                {t('sync.save')}
              </Button>
              <Button
                variant="outline"
                disabled={!settings.enabled || status === 'syncing'}
                onClick={() => void syncNow()}
              >
                <RefreshCw /> {t('sync.now')}
              </Button>
            </div>
            {settings.enabled && (
              <p className={status === 'error' ? 'text-red-600' : 'text-muted-foreground'}>
                {status === 'error'
                  ? message
                  : lastAt
                    ? t('sync.lastSynced', { time: new Date(lastAt).toLocaleTimeString() })
                    : t('sync.syncing')}
              </p>
            )}
            {conflicts.length > 0 && (
              <div className="rounded border border-amber-300 bg-amber-50 p-2">
                <p className="font-medium">{t('sync.conflicts')}</p>
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {conflicts.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

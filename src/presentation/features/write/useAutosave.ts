import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

/**
 * Debounced autosave. Patches are merged until the timer fires; whatever is pending is
 * flushed when the editor unmounts or the tab closes, so nothing typed is lost.
 */
export function useAutosave<Patch extends object>(
  save: (patch: Patch) => Promise<void>,
  delayMs = 700,
) {
  const pending = useRef<Patch | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const [status, setStatus] = useState<SaveStatus>('saved');

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const patch = pending.current;
    if (!patch) return;
    pending.current = null;
    setStatus('saving');
    try {
      await save(patch);
      setStatus(pending.current ? 'dirty' : 'saved');
    } catch {
      pending.current = { ...patch, ...(pending.current ?? {}) } as Patch;
      setStatus('error');
    }
  }, [save]);

  const schedule = useCallback(
    (patch: Patch) => {
      pending.current = { ...(pending.current ?? {}), ...patch } as Patch;
      setStatus('dirty');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), delayMs);
    },
    [flush, delayMs],
  );

  useEffect(() => {
    const onUnload = () => void flush();
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      void flush();
    };
  }, [flush]);

  return { schedule, flush, status };
}

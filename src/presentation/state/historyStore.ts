import { create } from 'zustand';
import type { Edition } from '@domain/entities/Edition';

const LIMIT = 50;

interface HistoryState {
  past: Readonly<Record<string, readonly Edition[]>>;
  future: Readonly<Record<string, readonly Edition[]>>;
  /** Remember `previous` before a change; any redo history is dropped. */
  record(editionId: string, previous: Edition): void;
  /** Steps back: returns the snapshot to restore, and remembers `current` for redo. */
  undo(editionId: string, current: Edition): Edition | undefined;
  redo(editionId: string, current: Edition): Edition | undefined;
}

/** Undo/redo for layout changes, kept per edition. Cleared when the page is reloaded. */
export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: {},
  future: {},
  record: (editionId, previous) =>
    set((s) => ({
      past: { ...s.past, [editionId]: [...(s.past[editionId] ?? []), previous].slice(-LIMIT) },
      future: { ...s.future, [editionId]: [] },
    })),
  undo: (editionId, current) => {
    const stack = get().past[editionId] ?? [];
    const previous = stack[stack.length - 1];
    if (!previous) return undefined;
    set((s) => ({
      past: { ...s.past, [editionId]: stack.slice(0, -1) },
      future: { ...s.future, [editionId]: [...(s.future[editionId] ?? []), current] },
    }));
    return previous;
  },
  redo: (editionId, current) => {
    const stack = get().future[editionId] ?? [];
    const next = stack[stack.length - 1];
    if (!next) return undefined;
    set((s) => ({
      future: { ...s.future, [editionId]: stack.slice(0, -1) },
      past: { ...s.past, [editionId]: [...(s.past[editionId] ?? []), current] },
    }));
    return next;
  },
}));

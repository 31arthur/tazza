import { create } from 'zustand';

interface EditionState {
  /** ISO date (YYYY-MM-DD) of the edition being worked on. */
  editionId: string;
  setEditionId(id: string): void;
}

export const useEditionStore = create<EditionState>((set) => ({
  editionId: '',
  setEditionId: (editionId) => set({ editionId }),
}));

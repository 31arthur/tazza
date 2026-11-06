import { createContext, useContext, type ReactNode } from 'react';
import type { UseCases } from '@domain/usecases';

export interface AppContextValue {
  useCases: UseCases;
  /** Today's date as YYYY-MM-DD. */
  today(): string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ value, children }: { value: AppContextValue; children: ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('AppProvider is missing');
  return ctx;
};

export const useUseCases = (): UseCases => useApp().useCases;
export const useToday = (): (() => string) => useApp().today;

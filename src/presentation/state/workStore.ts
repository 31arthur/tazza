import { create } from 'zustand';
import { ROLES, type Actor, type Role } from '@domain/entities/Workflow';

const KEY = 'tazza.work';

interface WorkState {
  name: string;
  role: Role;
  setName(name: string): void;
  setRole(role: Role): void;
}

const load = (): { name: string; role: Role } => {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    const saved = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
    const role = ROLES.find((r) => r === saved['role']) ?? 'editor';
    return { name: typeof saved['name'] === 'string' ? saved['name'] : '', role };
  } catch {
    return { name: '', role: 'editor' };
  }
};

const persist = (name: string, role: Role) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ name, role }));
  } catch {
    // Private browsing can refuse storage; the choice then lasts until the page is closed.
  }
};

/** Who is working, and in which role. Kept on this computer; it is a working hat, not a login. */
export const useWorkStore = create<WorkState>((set, get) => ({
  ...load(),
  setName: (name) => {
    persist(name, get().role);
    set({ name });
  },
  setRole: (role) => {
    persist(get().name, role);
    set({ role });
  },
}));

/** The current person as the domain wants to see them; a blank name falls back to the role. */
export const useActor = (): Actor => {
  const name = useWorkStore((s) => s.name);
  const role = useWorkStore((s) => s.role);
  return { name: name.trim() || role, role };
};

import { create } from 'zustand';
import { ROLES, type Actor, type Role } from '@domain/entities/Workflow';

const KEY = 'tazza.work';

interface WorkState {
  name: string;
  role: Role;
  /** Mock sign-in: there is no password, only a name and a role, kept on this computer. */
  signedIn: boolean;
  signIn(name: string, role: Role): void;
  signOut(): void;
  setRole(role: Role): void;
}

const load = (): { name: string; role: Role; signedIn: boolean } => {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    const saved = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
    const role = ROLES.find((r) => r === saved['role']) ?? 'editor';
    return {
      name: typeof saved['name'] === 'string' ? saved['name'] : '',
      role,
      signedIn: saved['signedIn'] === true,
    };
  } catch {
    return { name: '', role: 'editor', signedIn: false };
  }
};

const persist = (state: { name: string; role: Role; signedIn: boolean }) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private browsing can refuse storage; the choice then lasts until the page is closed.
  }
};

/** Who is working, and in which role. Kept on this computer; it is a working hat, not a login. */
export const useWorkStore = create<WorkState>((set, get) => ({
  ...load(),
  signIn: (name, role) => {
    const next = { name: name.trim(), role, signedIn: true };
    persist(next);
    set(next);
  },
  signOut: () => {
    const next = { name: get().name, role: get().role, signedIn: false };
    persist(next);
    set(next);
  },
  setRole: (role) => {
    persist({ name: get().name, role, signedIn: get().signedIn });
    set({ role });
  },
}));

/** The current person as the domain wants to see them; a blank name falls back to the role. */
export const useActor = (): Actor => {
  const name = useWorkStore((s) => s.name);
  const role = useWorkStore((s) => s.role);
  return { name: name.trim() || role, role };
};

import type { OrbitState } from "./state";

/** Who is signed in. `kind` says where their data lives. */
export interface Account {
  id: string;
  name: string;
  email?: string | null;
  kind: "local" | "claude" | "supabase";
}

/** Where one person's Orbit is stored. Loads once, saves after changes. */
export interface Backend {
  account: Account;
  load(): Promise<unknown | null>;
  save(state: OrbitState): Promise<void>;
}

/** Real AI, when this copy of Orbit has it (Claude sign-in, or a server key on the website). */
export interface AIProvider {
  ask(prompt: string): Promise<string>;
  /** Reads a photo or screenshot and returns plain text lines. */
  readImage?(image: Blob, prompt: string): Promise<string>;
}

/** Email + password accounts (website version). */
export interface AuthApi {
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, name: string): Promise<{ needsConfirmation: boolean }>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
}

/** Everything one environment (website, Claude link, this browser) provides. */
export interface SessionDriver {
  /** Calls back with the signed-in account (or null when signed out); returns a stop function. */
  start(onAccount: (account: Account | null) => void): () => void;
  backendFor(account: Account): Backend;
  auth?: AuthApi;
  ai?(): Promise<AIProvider | null>;
  /** Shown in Profile, e.g. "Saved to your Claude account". */
  storageLabel: string;
}

// ---------------------------------------------------------------------------
// This browser only (no account). Used when no sign-in service is configured.
// ---------------------------------------------------------------------------

const LOCAL_KEY = "orbit:state";

export function localBackend(account: Account): Backend {
  return {
    account,
    async load() {
      try {
        const raw = window.localStorage.getItem(LOCAL_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    async save(state) {
      try {
        window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
      } catch {
        // Private browsing can block storage; the app still works for this visit.
      }
    },
  };
}

export const LOCAL_ACCOUNT: Account = { id: "local", name: "", kind: "local" };

export const localDriver: SessionDriver = {
  start(onAccount) {
    onAccount(LOCAL_ACCOUNT);
    return () => {};
  },
  backendFor: localBackend,
  storageLabel: "Saved on this device",
};

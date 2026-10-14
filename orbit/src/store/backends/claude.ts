import type { Account, AIProvider, Backend, SessionDriver } from "../backend";
import { LOCAL_ACCOUNT, localBackend } from "../backend";
import type { OrbitState } from "../state";

/**
 * Orbit published as a Claude link. Each person signs in with their own
 * Claude account; their Orbit is one private document only they can read
 * (data/users/<their id>/orbit). Ask Orbit and photo reading use Claude.
 */

type DocSnap = { exists: boolean; data(): Record<string, unknown> | undefined };
type DocRef = { get(): Promise<DocSnap>; set(d: Record<string, unknown>): Promise<void> };
type DB = { doc(path: string): DocRef };
type UserNs = { id(): Promise<string | null>; me(): Promise<{ id: string | null; name: string; email: string | null }> };
type SampleFn = ((input: string, opts?: Record<string, unknown>) => Promise<{ text: string }>) & {
  limits(): Promise<{ images?: { maxCount: number; mediaTypes: string[] } }>;
};
type ClaudeWindow = { claude?: { use(name: string): Promise<unknown> } };

const use = <T,>(name: string): Promise<T | null> => {
  const c = (window as unknown as ClaudeWindow).claude;
  return c ? (c.use(name) as Promise<T | null>).catch(() => null) : Promise.resolve(null);
};

let dbRef: DB | null = null;

function claudeBackend(account: Account): Backend {
  if (account.kind !== "claude" || !dbRef) return localBackend(account);
  const doc = dbRef.doc(`data/users/${account.id}/orbit`);
  return {
    account,
    async load() {
      const snap = await doc.get();
      const json = snap.exists ? (snap.data()?.json as string | undefined) : undefined;
      return json ? JSON.parse(json) : null;
    },
    async save(state: OrbitState) {
      // Stored as one JSON string: field names in Orbit's data (ids with ":") stay intact.
      await doc.set({ json: JSON.stringify(state), version: state.version, savedAt: new Date().toISOString() });
    },
  };
}

export const claudeDriver: SessionDriver = {
  start(onAccount) {
    let stopped = false;
    (async () => {
      const [user, db] = await Promise.all([use<UserNs>("user"), use<DB>("db")]);
      const me = user ? await user.me() : null;
      if (stopped) return;
      if (me?.id && db) {
        dbRef = db;
        onAccount({ id: me.id, name: me.name, email: me.email, kind: "claude" });
      } else {
        // Opened outside Claude (or signed out): still usable, saved in this browser.
        onAccount(LOCAL_ACCOUNT);
      }
    })();
    return () => {
      stopped = true;
    };
  },
  backendFor: claudeBackend,
  storageLabel: "Saved privately to your Claude account",
  async ai(): Promise<AIProvider | null> {
    const sample = await use<SampleFn>("sample");
    if (!sample) return null;
    const limits = await sample.limits().catch(() => null);
    return {
      async ask(prompt) {
        const r = await sample(prompt, { modelTier: "default", cache: false });
        return r.text;
      },
      readImage: limits?.images
        ? async (image, prompt) => {
            const r = await sample(prompt, { images: [image], modelTier: "default", cache: false });
            return r.text;
          }
        : undefined,
    };
  },
};

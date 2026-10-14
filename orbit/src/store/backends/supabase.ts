import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Account, AIProvider, Backend, SessionDriver } from "../backend";
import type { OrbitState } from "../state";

/**
 * Website version: email + password accounts through Supabase. Each person's
 * Orbit is one row in `orbit_state`, protected by row-level security so only
 * they can read or write it (see supabase/schema.sql).
 */

let client: SupabaseClient | null = null;

export function supabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function getClient(): SupabaseClient {
  if (!client) client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return client;
}

function toAccount(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined): Account | null {
  if (!u) return null;
  return { id: u.id, email: u.email ?? null, name: String(u.user_metadata?.name ?? ""), kind: "supabase" };
}

function supabaseBackend(account: Account): Backend {
  const sb = getClient();
  return {
    account,
    async load() {
      const { data, error } = await sb.from("orbit_state").select("state").eq("user_id", account.id).maybeSingle();
      if (error) throw error;
      return data?.state ?? null;
    },
    async save(state: OrbitState) {
      const { error } = await sb.from("orbit_state").upsert({ user_id: account.id, state, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
  };
}

/** Friendlier wording for the errors people actually hit. */
function explain(message: string): string {
  if (/invalid login/i.test(message)) return "That email and password don't match.";
  if (/already registered|already exists/i.test(message)) return "There's already an account with that email. Try signing in.";
  if (/password should be/i.test(message)) return "Use a password with at least 6 characters.";
  if (/email not confirmed/i.test(message)) return "Check your inbox and confirm your email first.";
  if (/rate limit/i.test(message)) return "Too many tries. Wait a minute and try again.";
  return message;
}

export const supabaseDriver: SessionDriver = {
  start(onAccount) {
    const sb = getClient();
    sb.auth.getSession().then(({ data }) => onAccount(toAccount(data.session?.user)));
    const { data } = sb.auth.onAuthStateChange((_event, session) => onAccount(toAccount(session?.user)));
    return () => data.subscription.unsubscribe();
  },
  backendFor: supabaseBackend,
  storageLabel: "Saved to your Orbit account",
  auth: {
    async signIn(email, password) {
      const { error } = await getClient().auth.signInWithPassword({ email, password });
      if (error) throw new Error(explain(error.message));
    },
    async signUp(email, password, name) {
      const { data, error } = await getClient().auth.signUp({
        email,
        password,
        options: { data: { name }, emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
      });
      if (error) throw new Error(explain(error.message));
      return { needsConfirmation: !data.session };
    },
    async resetPassword(email) {
      const { error } = await getClient().auth.resetPasswordForEmail(email, { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined });
      if (error) throw new Error(explain(error.message));
    },
    async signOut() {
      await getClient().auth.signOut();
    },
  },
  async ai(): Promise<AIProvider | null> {
    return webAI();
  },
};

/** The website's AI goes through /api/ask, which only works when the server has an API key. */
export async function webAI(): Promise<AIProvider | null> {
  try {
    const res = await fetch("/api/ask", { method: "GET" });
    const info = (await res.json()) as { enabled?: boolean };
    if (!info.enabled) return null;
  } catch {
    return null;
  }
  const post = async (body: Record<string, unknown>) => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (supabaseConfigured()) {
      const { data } = await getClient().auth.getSession();
      if (data.session) headers.authorization = `Bearer ${data.session.access_token}`;
    }
    const res = await fetch("/api/ask", { method: "POST", headers, body: JSON.stringify(body) });
    const out = (await res.json()) as { text?: string; error?: string };
    if (!res.ok || !out.text) throw new Error(out.error ?? "Orbit couldn't answer right now.");
    return out.text;
  };
  return {
    ask: (prompt) => post({ prompt }),
    readImage: async (image, prompt) => {
      const buf = await image.arrayBuffer();
      let bin = "";
      new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
      return post({ prompt, image: { data: btoa(bin), mediaType: image.type || "image/jpeg" } });
    },
  };
}

"use client";

import { useState } from "react";
import { useSession } from "@/store/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Logo } from "./Logo";
import { cn } from "@/lib/cn";

type Mode = "signin" | "signup" | "reset";

/** Email + password sign-in for the website version. */
export function AuthScreen() {
  const { auth } = useSession();
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!auth) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signin") await auth.signIn(email.trim(), password);
      else if (mode === "signup") {
        const { needsConfirmation } = await auth.signUp(email.trim(), password, name.trim());
        if (needsConfirmation) {
          setNotice(`We sent a link to ${email.trim()}. Open it to confirm your account, then sign in here.`);
          setMode("signin");
        }
      } else {
        await auth.resetPassword(email.trim());
        setNotice("If that email has an account, a reset link is on its way.");
        setMode("signin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const field = "mt-1 block min-h-12 w-full rounded-xl border border-line-strong bg-surface px-4 text-[16px] text-ink";

  return (
    <div className="mx-auto flex min-h-[var(--app-h)] max-w-[440px] flex-col px-6 pb-10 pt-16">
      <div className="text-center">
        <Logo size="lg" />
        <h1 className="mt-6 text-[28px] leading-tight">{mode === "signup" ? "Create your Orbit" : mode === "signin" ? "Welcome back" : "Reset your password"}</h1>
        <p className="mt-2 text-[15.5px] text-ink-2">{mode === "reset" ? "We'll email you a link." : "Your life, without the mental juggling."}</p>
      </div>

      {mode !== "reset" && (
        <div role="tablist" aria-label="Account" className="mt-8 grid grid-cols-2 rounded-full bg-sunken p-1">
          {(["signup", "signin"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={cn("min-h-10 rounded-full text-[15px] font-medium", mode === m ? "bg-surface text-ink shadow-card" : "text-ink-3")}
            >
              {m === "signup" ? "Create account" : "Sign in"}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <label className="block text-[14px] text-ink-2">
            Your first name
            <input required autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </label>
        )}
        <label className="block text-[14px] text-ink-2">
          Email
          <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </label>
        {mode !== "reset" && (
          <label className="block text-[14px] text-ink-2">
            Password
            <input
              required
              type="password"
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
            />
          </label>
        )}
        {error && <p role="alert" className="rounded-xl bg-critical-soft px-4 py-3 text-[14.5px] text-critical">{error}</p>}
        {notice && <p role="status" className="rounded-xl bg-success-soft px-4 py-3 text-[14.5px] text-success">{notice}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
          {busy ? "One moment…" : mode === "signup" ? "Create account" : mode === "signin" ? "Sign in" : "Send reset link"}
        </Button>
      </form>

      <div className="mt-4 text-center text-[14.5px]">
        {mode === "signin" && (
          <button type="button" onClick={() => setMode("reset")} className="text-accent">
            Forgot your password?
          </button>
        )}
        {mode === "reset" && (
          <button type="button" onClick={() => setMode("signin")} className="text-accent">
            Back to sign in
          </button>
        )}
      </div>
      <p className="mt-auto pt-10 text-center text-[13px] text-ink-3">Your Orbit is private to your account. Orbit never sends, posts, or buys anything for you.</p>
    </div>
  );
}

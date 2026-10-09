"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Lock } from "lucide-react";
import type { ConnectedSource } from "@/types";
import { Button } from "@/components/ui/Button";
import { OrbitMark } from "@/components/shell/Logo";
import { ConnectionIcon } from "./ConnectionIcon";

type Step = "explain" | "signin" | "connecting" | "done";

const PROVIDER: Record<string, string> = {
  "Google Calendar": "Google",
  Gmail: "Google",
  "Google Drive": "Google",
  Canvas: "Canvas",
  GroupMe: "GroupMe",
  Outlook: "Microsoft",
  "Outlook Calendar": "Microsoft",
  "Apple Calendar": "Apple",
  Reminders: "Apple",
  "Apple Notes": "Apple",
  Messages: "Apple",
};

/**
 * Three short steps: what ORBIT looks for → sign in → connected.
 * Sign-in is simulated in the prototype.
 */
export function ConnectFlow({ source, email, onConnected, onClose }: { source: ConnectedSource; email: string; onConnected: () => void; onClose: () => void }) {
  const [step, setStep] = useState<Step>("explain");
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const provider = PROVIDER[source.name] ?? source.name;

  if (step === "explain") {
    return (
      <div className="animate-rise-in">
        <div className="flex items-center gap-3">
          <ConnectionIcon source={source} size={44} />
          <p className="text-[20px] font-semibold">Connect {source.name}</p>
        </div>
        <p className="mt-5 text-[15px] font-medium text-ink-2">ORBIT will look for:</p>
        <ul className="mt-2 space-y-1.5">
          {source.notices.map((n) => (
            <li key={n} className="flex items-center gap-2 text-[16px]">
              <Check size={16} className="text-success" aria-hidden /> {n}
            </li>
          ))}
        </ul>
        <p className="mt-5 flex items-start gap-2 rounded-xl bg-sunken px-3 py-2.5 text-[14.5px] text-ink-2">
          <Lock size={15} className="mt-0.5 shrink-0" aria-hidden /> {source.promise}
        </p>
        <div className="mt-6 flex gap-2">
          <Button variant="primary" onClick={() => setStep("signin")} autoFocus>
            Continue
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Not now
          </Button>
        </div>
      </div>
    );
  }

  if (step === "signin") {
    return (
      <div className="animate-rise-in">
        <div className="rounded-2xl border border-line p-5 text-center">
          <p className="text-[13px] font-medium uppercase tracking-wide text-ink-3">{provider}</p>
          <p className="mt-2 text-[19px] font-semibold">Sign in to continue to ORBIT</p>
          <button
            type="button"
            autoFocus
            onClick={() => {
              setStep("connecting");
              timer.current = window.setTimeout(() => {
                onConnected();
                setStep("done");
              }, 900);
            }}
            className="mt-5 flex w-full items-center gap-3 rounded-xl border border-line-strong px-4 py-3 text-left hover:bg-canvas"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-strong" aria-hidden>
              {email[0].toUpperCase()}
            </span>
            <span>
              <span className="block text-[15px] font-medium">Continue as {email}</span>
              <span className="block text-[13px] text-ink-3">Read-only access</span>
            </span>
          </button>
        </div>
        <p className="mt-3 text-center text-[13px] text-ink-3">Prototype: no real account is connected.</p>
      </div>
    );
  }

  if (step === "connecting") {
    return (
      <div className="flex flex-col items-center py-10" aria-live="polite">
        <OrbitMark size={40} spinning className="text-ink" />
        <p className="mt-4 text-[16px] text-ink-2">Connecting {source.name}…</p>
      </div>
    );
  }

  return (
    <div className="animate-rise-in py-4 text-center" aria-live="polite">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
        <Check size={28} strokeWidth={2.5} aria-hidden />
      </span>
      <p className="mt-4 text-[20px] font-semibold">{source.name} connected</p>
      <p className="mt-1 text-[15.5px] text-ink-2">ORBIT can now help with {source.notices[0].toLowerCase()}.</p>
      <Button variant="primary" className="mt-6" onClick={onClose} autoFocus>
        Done
      </Button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, RotateCcw, X } from "lucide-react";
import type { DemoTime, NotificationSettings } from "@/types";
import { cn } from "@/lib/cn";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { LearningPrompt } from "@/components/ui/LearningPrompt";

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="block text-[15.5px] font-medium">{label}</span>
        <span className="block text-[14px] text-ink-3">{description}</span>
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className={cn("h-7 w-12 rounded-full transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent", checked ? "bg-accent" : "bg-line-strong")} aria-hidden />
        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} aria-hidden />
      </span>
    </label>
  );
}

const NOTIFICATIONS: { key: keyof NotificationSettings; label: string; description: string }[] = [
  { key: "urgent", label: "Urgent", description: "Rare. A hard deadline in the next few hours." },
  { key: "today", label: "Today", description: "Someone important is waiting, or a plan needs you today." },
  { key: "morningBrief", label: "Morning brief", description: "One short summary when you start your day." },
  { key: "importantChanges", label: "Important changes", description: "An exam, deadline, or meeting moves." },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-ink-3">{title}</h2>
      {children}
    </section>
  );
}

/** Profile: connections first, then notifications, what ORBIT learned, and account. */
export default function SettingsPage() {
  const { state, derived, dispatch } = useOrbit();
  const { notify, open } = useUI();
  const router = useRouter();
  const connected = state.sources.filter((s) => s.status === "connected");
  const { routines } = derived.learned;

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header className="flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-[22px] font-semibold text-accent-strong" aria-hidden>
          {state.user.name[0]}
        </span>
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">{state.user.fullName}</h1>
          <p className="text-[15px] text-ink-2">{state.user.school} · {state.user.year}</p>
        </div>
      </header>

      <Link href="/settings/connections" className="group block rounded-2xl border border-line bg-surface p-5 shadow-card hover:shadow-raised">
        <p className="text-[17px] font-semibold">ORBIT is connected to {connected.length} {connected.length === 1 ? "place" : "places"}</p>
        <p className="mt-0.5 text-[15px] text-ink-2">{connected.map((s) => s.name.replace("Google ", "")).join(" · ") || "Nothing yet"}</p>
        <p className="mt-3 inline-flex items-center gap-1 text-[15px] font-medium text-accent">
          Manage connections <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
        </p>
      </Link>

      <Section title="Notifications">
        <div className="divide-y divide-line">
          {NOTIFICATIONS.map((n) => (
            <Toggle key={n.key} label={n.label} description={n.description} checked={state.notificationSettings[n.key]} onChange={(v) => dispatch({ type: "SET_NOTIFICATION", key: n.key, value: v })} />
          ))}
        </div>
        <p className="mt-2 text-[14px] text-ink-3">Everything else stays quietly inside ORBIT.</p>
      </Section>

      <Section title="What ORBIT has learned">
        {derived.learned.prompts.filter((p) => p.surface === "today").map((p) => (
          <div key={p.id} className="mb-3">
            <LearningPrompt prompt={p} />
          </div>
        ))}
        {routines.length ? (
          <ul className="divide-y divide-line">
            {routines.map((r) => (
              <li key={r.id} className="py-3">
                <p className="text-[15.5px] font-medium">{r.pattern}</p>
                <p className="text-[14px] text-ink-3">{r.effect}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-ink-2">Nothing yet. ORBIT learns quietly from what you open, finish, snooze, and dismiss.</p>
        )}
        {state.preferences.ignoredSources.length > 0 && (
          <div className="mt-4">
            <p className="text-[15px] font-medium">Hidden sources</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {state.preferences.ignoredSources.map((s) => (
                <li key={s.key} className="inline-flex items-center gap-1 rounded-full bg-sunken py-1 pl-3 pr-1 text-[14px]">
                  {s.label}
                  <button
                    type="button"
                    aria-label={`Show ${s.label} again`}
                    onClick={() => {
                      dispatch({ type: "UNIGNORE_SOURCE", key: s.key });
                      notify(`ORBIT will show ${s.label} again.`, { undoable: true });
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-ink-3 hover:bg-line hover:text-ink"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button size="sm" variant="ghost" className="mt-3 -ml-3" onClick={() => { dispatch({ type: "RESET_LEARNING" }); notify("ORBIT will start learning from scratch.", { undoable: true }); }}>
          Reset what ORBIT learned
        </Button>
      </Section>

      <Section title="Account">
        <p className="text-[15.5px]">{state.user.email}</p>
        <p className="text-[14px] text-ink-3">Time zone: Eastern</p>
      </Section>

      <Section title="Prototype">
        <div className="space-y-4 rounded-2xl bg-sunken p-4">
          <div>
            <p className="mb-2 text-[14.5px] text-ink-2">See how Today changes through Friday, October 9.</p>
            <SegmentedControl<DemoTime>
              label="Demo time"
              value={state.demoTime}
              onChange={(t) => {
                dispatch({ type: "SET_DEMO_TIME", time: t });
                router.push("/today");
              }}
              options={[
                { value: "morning", label: "Morning" },
                { value: "midday", label: "Midday" },
                { value: "evening", label: "Evening" },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => open({ type: "brief" })}>Show morning brief</Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                dispatch({ type: "RESET_DEMO" });
                router.push("/today");
                notify("Demo reset.");
              }}
            >
              <RotateCcw size={15} aria-hidden /> Reset demo
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}

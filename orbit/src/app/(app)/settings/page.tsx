"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, GraduationCap, Mail, MessageCircle, MessagesSquare, FileText, RotateCcw, X } from "lucide-react";
import type { NotificationSettings, SourceKind } from "@/types";
import { cn } from "@/lib/cn";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Card, PageHeader, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Badges";

const ICON: Partial<Record<SourceKind, typeof Mail>> = { calendar: CalendarDays, email: Mail, canvas: GraduationCap, groupme: MessagesSquare, text: MessageCircle };

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3.5">
      <span>
        <span className="block text-[15.5px] font-medium">{label}</span>
        {description && <span className="block text-[14px] text-ink-3">{description}</span>}
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
  { key: "morningBrief", label: "Morning Brief", description: "A short summary the first time you open ORBIT each morning." },
  { key: "importantChanges", label: "Important changes", description: "When an exam, deadline, or meeting appears to move." },
  { key: "urgentDeadlines", label: "Urgent deadlines", description: "Only hard deadlines in the next day." },
  { key: "needsReply", label: "Needs reply", description: "When someone important is waiting on you." },
];

export default function SettingsPage() {
  const { state, dispatch } = useOrbit();
  const { notify, open } = useUI();
  const router = useRouter();
  const learned = Object.entries(state.preferences.sourceAdjust).filter(([, v]) => v !== 0);
  const learnedRecs = Object.entries(state.preferences.recommendationAdjust).filter(([, v]) => v !== 0);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader title="Settings" subtitle="ORBIT learns from what you do. You can see and change all of it here." />

      <section aria-labelledby="account">
        <SectionHeader id="account" title="Account" />
        <Card className="flex items-center gap-4 p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-[18px] font-semibold text-accent-strong" aria-hidden>
            {state.user.name[0]}
          </span>
          <div>
            <p className="text-[16px] font-semibold">{state.user.fullName}</p>
            <p className="text-[14.5px] text-ink-2">{state.user.school} · {state.user.year}</p>
            <p className="text-[14px] text-ink-3">{state.user.email}</p>
          </div>
        </Card>
      </section>

      <section aria-labelledby="sources">
        <SectionHeader id="sources" title="Connected sources" />
        <Card className="divide-y divide-line px-5">
          {state.sources.map((s) => {
            const Icon = ICON[s.kind] ?? FileText;
            return (
              <div key={s.id} className="flex items-center gap-4 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sunken" aria-hidden>
                  <Icon size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[15.5px] font-medium">
                    {s.name}
                    {s.enabled ? (
                      <Pill tone={s.status === "connected" ? "success" : "neutral"}>{s.status === "connected" ? "Connected" : "Demo connection"}</Pill>
                    ) : (
                      <Pill>Paused</Pill>
                    )}
                  </p>
                  <p className="text-[14px] text-ink-3">{s.detail}</p>
                </div>
                <Button
                  size="sm"
                  variant={s.enabled ? "secondary" : "primary"}
                  onClick={() => {
                    dispatch({ type: "SET_SOURCE_ENABLED", id: s.id, enabled: !s.enabled });
                    notify(s.enabled ? `ORBIT stopped reading ${s.name}.` : `ORBIT is reading ${s.name} again.`, { undoable: true });
                  }}
                >
                  {s.enabled ? "Pause" : "Resume"}
                </Button>
              </div>
            );
          })}
          <div className="flex items-center gap-4 py-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sunken" aria-hidden>
              <FileText size={19} />
            </span>
            <div className="flex-1">
              <p className="text-[15.5px] font-medium">Uploaded documents</p>
              <p className="text-[14px] text-ink-3">{state.documents.length} syllabi and course files</p>
            </div>
          </div>
        </Card>
        <p className="mt-2 text-[13.5px] text-ink-3">Integrations are simulated in this prototype. Pausing a source hides everything ORBIT learned from it.</p>
      </section>

      <section aria-labelledby="notifications">
        <SectionHeader id="notifications" title="Notifications" />
        <Card className="divide-y divide-line px-5">
          {NOTIFICATIONS.map((n) => (
            <Toggle
              key={n.key}
              label={n.label}
              description={n.description}
              checked={state.notificationSettings[n.key]}
              onChange={(v) => dispatch({ type: "SET_NOTIFICATION", key: n.key, value: v })}
            />
          ))}
        </Card>
        <p className="mt-2 text-[13.5px] text-ink-3">Everything else stays quietly inside ORBIT until you look.</p>
      </section>

      <section aria-labelledby="prefs">
        <SectionHeader id="prefs" title="ORBIT preferences" />
        <Card className="p-5">
          <p className="text-[15.5px] font-semibold">Sources ORBIT ignores</p>
          {state.preferences.ignoredSources.length ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {state.preferences.ignoredSources.map((s) => (
                <li key={s.key} className="inline-flex items-center gap-1 rounded-full bg-sunken py-1 pl-3 pr-1 text-[14px]">
                  {s.label}
                  <button
                    type="button"
                    aria-label={`Stop ignoring ${s.label}`}
                    onClick={() => {
                      dispatch({ type: "UNIGNORE_SOURCE", key: s.key });
                      notify(`ORBIT will read ${s.label} again.`, { undoable: true });
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-ink-3 hover:bg-line hover:text-ink"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[14.5px] text-ink-3">None. Use “Always ignore this source” on any message to add one.</p>
          )}

          <p className="mt-6 text-[15.5px] font-semibold">What ORBIT has learned</p>
          {learned.length || learnedRecs.length ? (
            <ul className="mt-2 space-y-1.5 text-[14.5px]">
              {learned.map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3">
                  <span>{k.replace(/^sender:|^type:/, "")}</span>
                  <span className={v > 0 ? "text-success" : "text-ink-3"}>{v > 0 ? "More important to you" : "Less important to you"}</span>
                </li>
              ))}
              {learnedRecs.map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3">
                  <span>{k.replace("attention:", "").replace("_", " ").replace(/^./, (c) => c.toUpperCase())} alerts</span>
                  <span className={v > 0 ? "text-success" : "text-ink-3"}>{v > 0 ? "Show more" : "Show fewer"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[14.5px] text-ink-3">Nothing yet. When you mark things important or not, ORBIT adjusts and lists it here.</p>
          )}
          {(learned.length > 0 || learnedRecs.length > 0) && (
            <Button size="sm" variant="ghost" className="mt-3" onClick={() => { dispatch({ type: "RESET_LEARNING" }); notify("ORBIT's learned preferences were reset.", { undoable: true }); }}>
              Reset what ORBIT learned
            </Button>
          )}
        </Card>
      </section>

      <section aria-labelledby="demo">
        <SectionHeader id="demo" title="Prototype" />
        <Card className="flex flex-wrap items-center gap-3 p-5">
          <p className="flex-1 text-[14.5px] text-ink-2">This is a demo with sample data on a fixed date (Friday, October 9). Your changes are saved in this browser.</p>
          <Button variant="secondary" onClick={() => open({ type: "brief" })}>Show Morning Brief</Button>
          <Button
            variant="danger"
            onClick={() => {
              dispatch({ type: "RESET_DEMO" });
              router.push("/today");
              notify("Demo reset to Friday morning.");
            }}
          >
            <RotateCcw size={16} aria-hidden /> Reset demo
          </Button>
        </Card>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  Briefcase,
  Check,
  GraduationCap,
  HeartHandshake,
  Home,
  Plane,
  Plus,
  Search,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Category, Involvement } from "@/types";
import { cn } from "@/lib/cn";
import { areaLabel, areaStyle, BUILTIN_AREAS, customArea } from "@/lib/areas";
import { relativeDay } from "@/lib/time";
import { nowStr, todayStr } from "@/lib/clock";
import { buildGoal, GOAL_EXAMPLES } from "@/services/goals";
import { useOrbit } from "@/store/OrbitProvider";
import { Button } from "@/components/ui/Button";
import { Logo, OrbitMark } from "@/components/shell/Logo";
import { Modal } from "@/components/ui/Overlay";
import { ConnectFlow } from "@/components/connections/ConnectFlow";
import { ConnectionIcon } from "@/components/connections/ConnectionIcon";

const LIVES: { value: string; icon: LucideIcon; areas: Category[] }[] = [
  { value: "Student", icon: GraduationCap, areas: ["school"] },
  { value: "Working", icon: Briefcase, areas: ["work"] },
  { value: "Parent / family", icon: Users, areas: ["family"] },
  { value: "Small business owner", icon: Store, areas: ["custom:Business", "money"] },
  { value: "Managing a household", icon: Home, areas: ["home", "money"] },
  { value: "Caregiver", icon: HeartHandshake, areas: ["family", "health"] },
  { value: "Job searching", icon: Search, areas: ["career"] },
  { value: "Travel often", icon: Plane, areas: ["travel"] },
  { value: "Health & fitness", icon: Activity, areas: ["health"] },
];

const DAYS = ["Mostly the same each week", "They change a lot", "Packed, back to back", "Pretty flexible"];

const MESSY = [
  "I forget small things",
  "My schedule changes often",
  "Things live in too many apps",
  "I procrastinate",
  "I overbook myself",
  "I struggle to prioritize",
  "I manage things for other people",
  "I remember things at the wrong time",
];

const INVOLVEMENT: { value: Involvement; label: string; body: string }[] = [
  { value: "quiet", label: "Quiet", body: "Only tell me when something important needs attention." },
  { value: "helpful", label: "Helpful", body: "Surface important things and suggest what I should do." },
  { value: "proactive", label: "Proactive", body: "Help me plan ahead and keep things moving." },
];

/** Which connections to suggest, and why, based on the user's life. */
function recommendedConnections(lives: string[]): { id: string; why: string }[] {
  const out: { id: string; why: string }[] = [
    { id: "src-gcal", why: "So Orbit can see when you actually have time." },
    { id: "src-gmail", why: "So Orbit can notice important changes and deadlines." },
  ];
  if (lives.includes("Student")) out.push({ id: "src-canvas", why: "So Orbit can track assignments and exam changes." });
  if (lives.includes("Working") || lives.includes("Small business owner")) out.push({ id: "src-slack", why: "So Orbit can catch requests from your team." });
  if (lives.includes("Parent / family") || lives.includes("Caregiver")) out.push({ id: "src-apple-cal", why: "So Orbit sees pickups, appointments, and family plans." });
  if (lives.includes("Health & fitness")) out.push({ id: "src-strava", why: "So runs and workouts check themselves off." });
  if (out.length < 4) out.push({ id: "src-messages", why: "So Orbit notices texts that need a reply." });
  return out.slice(0, 5);
}

type StepId = "welcome" | "name" | "how" | "life" | "areas" | "days" | "messy" | "involvement" | "connect" | "goal" | "ready";
// Real accounts skip the connections step until real integrations exist.
const LIVE_STEPS: StepId[] = ["welcome", "name", "how", "life", "areas", "days", "messy", "involvement", "goal", "ready"];
const DEMO_STEPS: StepId[] = ["welcome", "how", "life", "areas", "days", "messy", "involvement", "connect", "goal", "ready"];

function Title({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-[30px] leading-[1.15]">{children}</h1>
      {sub && <p className="mt-2 text-[16px] text-ink-2">{sub}</p>}
    </div>
  );
}

function Choice({ on, onClick, children, role = "checkbox", className }: { on: boolean; onClick: () => void; children: React.ReactNode; role?: "checkbox" | "radio"; className?: string }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors",
        on ? "border-ink bg-surface shadow-card" : "border-line bg-surface/60 hover:border-line-strong",
        className,
      )}
    >
      {children}
      <span className={cn("ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", on ? "border-ink bg-ink text-canvas" : "border-line-strong")} aria-hidden>
        {on && <Check size={12} strokeWidth={3} />}
      </span>
    </button>
  );
}

/** A tiny, looping example of Notice → Connect → Help. */
function HowExample() {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setShown((s) => (s + 1) % 5), 900);
    return () => window.clearInterval(t);
  }, []);
  const rows = [
    { label: "Notice", text: "FIN 359 exam moved", sub: "Thursday → Tuesday" },
    { label: "Connect", text: "Your study plan loses 2 days", sub: "Monday's exam is the same week" },
    { label: "Help", text: "Better study time found", sub: "Saturday 2–4 PM · Add it?" },
  ];
  return (
    <ol className="mt-8 space-y-1" aria-label="Example">
      {rows.map((r, i) => (
        <li key={r.label}>
          {i > 0 && <ArrowDown size={16} className={cn("mx-auto my-1 text-ink-3 transition-opacity duration-500", shown > i ? "opacity-100" : "opacity-20")} aria-hidden />}
          <div className={cn("rounded-2xl bg-surface px-4 py-3 shadow-card transition-opacity duration-500", shown >= i ? "opacity-100" : "opacity-25")}>
            <p className="text-[13px] font-medium text-accent">{r.label}</p>
            <p className="text-[16px] font-semibold">{r.text}</p>
            <p className="text-[14px] text-ink-2">{r.sub}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function OnboardingPage() {
  const { state, dispatch } = useOrbit();
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [lives, setLives] = useState<string[]>([]);
  const [otherLife, setOtherLife] = useState("");
  const [otherOn, setOtherOn] = useState(false);
  const [areas, setAreas] = useState<Category[] | null>(null);
  const [customName, setCustomName] = useState("");
  const [days, setDays] = useState<string | undefined>();
  const [messy, setMessy] = useState<string[]>([]);
  const [messyOther, setMessyOther] = useState("");
  const [messyOtherOn, setMessyOtherOn] = useState(false);
  const [involvement, setInvolvement] = useState<Involvement>("helpful");
  const [linked, setLinked] = useState<string[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [goalText, setGoalText] = useState("");
  const [goalAdded, setGoalAdded] = useState<string | undefined>();

  const STEPS = state.mode === "live" ? LIVE_STEPS : DEMO_STEPS;
  const id = STEPS[Math.min(stepIndex, STEPS.length - 1)];
  const [name, setName] = useState(state.user.name);
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  // Areas start from what the user said about their life; they can change anything.
  const suggestedAreas = useMemo(() => {
    const set = new Set<Category>();
    lives.forEach((l) => LIVES.find((x) => x.value === l)?.areas.forEach((a) => set.add(a)));
    (["social", "personal"] as Category[]).forEach((a) => set.add(a));
    return [...set];
  }, [lives]);
  const chosenAreas = areas ?? suggestedAreas;
  const areaChoices = useMemo(() => [...BUILTIN_AREAS, ...chosenAreas.filter((a) => !(BUILTIN_AREAS as string[]).includes(a))], [chosenAreas]);
  const goalPreview = useMemo(() => (goalText.trim() ? buildGoal(goalText, todayStr(), nowStr()) : undefined), [goalText]);
  const connections = recommendedConnections(lives);

  const next = () => setStepIndex((s) => Math.min(s + 1, STEPS.length - 1));
  const finish = (skipped = false) => {
    if (!skipped) {
      dispatch({
        type: "SET_PROFILE",
        patch: {
          lives: otherOn && otherLife.trim() ? [...lives, otherLife.trim()] : lives,
          otherLife: otherOn ? otherLife.trim() || undefined : undefined,
          areas: chosenAreas.length ? chosenAreas : state.profile.areas,
          messy: messyOtherOn && messyOther.trim() ? [...messy, messyOther.trim()] : messy,
          days,
          involvement,
        },
      });
    }
    dispatch({ type: "COMPLETE_ONBOARDING" });
    router.push("/today");
  };

  const pct = Math.round((stepIndex / (STEPS.length - 1)) * 100);
  const canSkip = id !== "welcome" && id !== "ready";

  return (
    <div className="mx-auto flex min-h-[var(--app-h)] max-w-[480px] flex-col">
      <header className="flex items-center justify-between px-4 pb-1 pt-3">
        {stepIndex > 0 && id !== "ready" ? (
          <button type="button" onClick={() => setStepIndex((s) => s - 1)} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-sunken">
            <ArrowLeft size={20} aria-hidden />
          </button>
        ) : (
          <span className="h-10 w-10" />
        )}
        {stepIndex > 0 && (
          <div className="h-1 w-32 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`Step ${stepIndex + 1} of ${STEPS.length}`}>
            <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        )}
        {canSkip ? (
          <button type="button" onClick={() => finish(true)} className="min-h-10 rounded-xl px-2 text-[15px] text-ink-3 hover:text-ink">
            Skip
          </button>
        ) : (
          <span className="h-10 w-10" />
        )}
      </header>

      <main className="flex flex-1 flex-col px-6 pb-8 pt-6">
        <div key={id} className="flex flex-1 animate-rise-in flex-col">
          {id === "welcome" && (
            <div className="flex flex-1 flex-col">
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <OrbitMark size={64} spinning className="text-ink" />
                <Logo size="lg" className="mt-6" />
                <h1 className="mt-8 text-[32px] leading-[1.15]">Your life, without the mental juggling.</h1>
                <p className="mt-3 text-[16.5px] text-ink-2">Most apps wait for you to manage them. Orbit notices.</p>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => {
                  if (state.mode !== "live") dispatch({ type: "START_LIVE" });
                  next();
                }}
                data-autofocus
              >
                Get started
              </Button>
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: "LOAD_DEMO" });
                  router.push("/today");
                }}
                className="mt-3 min-h-11 w-full text-[15px] text-ink-2 hover:text-ink"
              >
                Look around with sample data first
              </button>
            </div>
          )}

          {id === "name" && (
            <form
              className="flex flex-1 flex-col"
              onSubmit={(e) => {
                e.preventDefault();
                const full = name.trim();
                dispatch({ type: "SET_USER", patch: { name: full.split(/\s+/)[0] ?? "", fullName: full } });
                next();
              }}
            >
              <Title sub="So your mornings start with your name.">What should Orbit call you?</Title>
              <label htmlFor="your-name" className="sr-only">Your name</label>
              <input
                id="your-name"
                autoFocus
                autoComplete="given-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your first name"
                className="mt-6 block min-h-12 w-full rounded-2xl border border-line-strong bg-surface px-4 text-[17px]"
              />
              <div className="flex-1" />
              <Button type="submit" variant="primary" size="lg" className="mt-8 w-full" disabled={!name.trim()}>
                Continue
              </Button>
            </form>
          )}

          {id === "how" && (
            <div className="flex flex-1 flex-col">
              <Title>Orbit keeps up with life.</Title>
              <ul className="mt-6 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Notice", "Something changed."],
                  ["Connect", "Orbit sees what it affects."],
                  ["Help", "You get a clear next step."],
                ].map(([t, b]) => (
                  <li key={t} className="rounded-2xl bg-surface px-2 py-3 shadow-card">
                    <p className="text-[15px] font-semibold">{t}</p>
                    <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{b}</p>
                  </li>
                ))}
              </ul>
              <HowExample />
              <div className="flex-1" />
              <Button variant="primary" size="lg" className="mt-8 w-full" onClick={next}>
                Show me
              </Button>
            </div>
          )}

          {id === "life" && (
            <div className="flex flex-1 flex-col">
              <Title sub="Choose anything that fits.">Tell Orbit a little about your life.</Title>
              <div className="mt-6 space-y-2">
                {LIVES.map(({ value, icon: Icon }) => (
                  <Choice key={value} on={lives.includes(value)} onClick={() => setLives((l) => toggle(l, value))}>
                    <Icon size={19} className="shrink-0 text-ink-2" aria-hidden />
                    <span className="text-[16px]">{value}</span>
                  </Choice>
                ))}
                <Choice on={otherOn} onClick={() => setOtherOn((o) => !o)}>
                  <Plus size={19} className="shrink-0 text-ink-2" aria-hidden />
                  <span className="text-[16px]">Something else</span>
                </Choice>
                {otherOn && (
                  <label className="block pt-1 text-[14px] text-ink-2">
                    What else is part of your life?
                    <input autoFocus value={otherLife} onChange={(e) => setOtherLife(e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-[16px] text-ink" placeholder="Training for a marathon, planning a wedding…" />
                  </label>
                )}
              </div>
              <Button variant="primary" size="lg" className="mt-8 w-full" onClick={next}>
                Continue
              </Button>
            </div>
          )}

          {id === "areas" && (
            <div className="flex flex-1 flex-col">
              <Title sub="Pick as many as you like. You can change these anytime.">What parts of life should Orbit help you keep track of?</Title>
              <div className="mt-6 flex flex-wrap gap-2">
                {areaChoices.map((a) => {
                  const on = chosenAreas.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setAreas(toggle(chosenAreas, a))}
                      className={cn("inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[15.5px] transition-colors", on ? "border-ink bg-surface text-ink shadow-card" : "border-line text-ink-2 hover:border-line-strong")}
                    >
                      <span className={cn("h-2.5 w-2.5 rounded-full", areaStyle(a).dot, !on && "opacity-50")} aria-hidden />
                      {areaLabel(a)}
                    </button>
                  );
                })}
              </div>
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!customName.trim()) return;
                  setAreas([...chosenAreas, customArea(customName)]);
                  setCustomName("");
                }}
              >
                <label htmlFor="own-area" className="sr-only">Add my own</label>
                <input id="own-area" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Add my own: Wedding, My daughter…" className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-[15.5px]" />
                <button type="submit" disabled={!customName.trim()} className="min-h-11 rounded-xl bg-sunken px-4 text-[15px] font-medium disabled:opacity-40">
                  Add
                </button>
              </form>
              <div className="flex-1" />
              <Button variant="primary" size="lg" className="mt-8 w-full" onClick={next} disabled={!chosenAreas.length}>
                Continue
              </Button>
            </div>
          )}

          {id === "days" && (
            <div className="flex flex-1 flex-col">
              <Title sub="So Orbit knows when to plan and when to stay out of the way.">How do your days usually go?</Title>
              <div role="radiogroup" aria-label="How do your days usually go?" className="mt-6 space-y-2">
                {DAYS.map((d) => (
                  <Choice key={d} role="radio" on={days === d} onClick={() => setDays(d)}>
                    <span className="text-[16px]">{d}</span>
                  </Choice>
                ))}
              </div>
              <div className="flex-1" />
              <Button variant="primary" size="lg" className="mt-8 w-full" onClick={next}>
                Continue
              </Button>
            </div>
          )}

          {id === "messy" && (
            <div className="flex flex-1 flex-col">
              <Title sub="Choose anything that sounds familiar.">What usually makes life feel messy?</Title>
              <div className="mt-6 space-y-2">
                {MESSY.map((m) => (
                  <Choice key={m} on={messy.includes(m)} onClick={() => setMessy((x) => toggle(x, m))}>
                    <span className="text-[15.5px]">{m}</span>
                  </Choice>
                ))}
                <Choice on={messyOtherOn} onClick={() => setMessyOtherOn((o) => !o)}>
                  <span className="text-[15.5px]">Something else</span>
                </Choice>
                {messyOtherOn && (
                  <input autoFocus aria-label="What else makes life feel messy?" value={messyOther} onChange={(e) => setMessyOther(e.target.value)} className="block min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-[16px]" />
                )}
              </div>
              <Button variant="primary" size="lg" className="mt-8 w-full" onClick={next}>
                Continue
              </Button>
            </div>
          )}

          {id === "involvement" && (
            <div className="flex flex-1 flex-col">
              <Title sub="You can change this anytime.">How involved should Orbit be?</Title>
              <div role="radiogroup" aria-label="How involved should Orbit be?" className="mt-6 space-y-2">
                {INVOLVEMENT.map((o) => (
                  <Choice key={o.value} role="radio" on={involvement === o.value} onClick={() => setInvolvement(o.value)}>
                    <span>
                      <span className="block text-[16px] font-semibold">{o.label}</span>
                      <span className="block text-[14.5px] text-ink-2">{o.body}</span>
                    </span>
                  </Choice>
                ))}
              </div>
              <div className="flex-1" />
              <Button variant="primary" size="lg" className="mt-8 w-full" onClick={next}>
                Continue
              </Button>
            </div>
          )}

          {id === "connect" && (
            <div className="flex flex-1 flex-col">
              <Title sub="Based on what you told Orbit. Connect any, or none.">Recommended for you</Title>
              <ul className="mt-6 space-y-2">
                {connections.map(({ id: sid, why }) => {
                  const src = state.sources.find((s) => s.id === sid);
                  if (!src) return null;
                  const done = linked.includes(sid);
                  return (
                    <li key={sid} className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-card">
                      <ConnectionIcon source={{ ...src, status: done ? "connected" : "available" }} size={38} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15.5px] font-semibold">{src.name}</p>
                        <p className="text-[13.5px] leading-snug text-ink-2">{why}</p>
                      </div>
                      {done ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-[14px] font-medium text-success">
                          <Check size={15} aria-hidden /> Connected
                        </span>
                      ) : (
                        <Button size="sm" variant="secondary" className="shrink-0" onClick={() => setConnectingId(sid)}>
                          Connect
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 px-1 text-[13.5px] text-ink-3">Orbit only reads. It never sends, posts, or changes anything without you.</p>
              <div className="flex-1" />
              <Button variant="primary" size="lg" className="mt-8 w-full" onClick={next}>
                {linked.length ? "Continue" : "Skip for now"}
              </Button>
              {connectingId && (
                <Modal title="Connect" hideTitle onClose={() => setConnectingId(null)}>
                  <ConnectFlow
                    source={state.sources.find((x) => x.id === connectingId)!}
                    email={state.user.email}
                    onConnected={() => {
                      setLinked((l) => [...l, connectingId]);
                      dispatch({ type: "SET_SOURCE_STATUS", id: connectingId, status: "connected" });
                    }}
                    onClose={() => setConnectingId(null)}
                  />
                </Modal>
              )}
            </div>
          )}

          {id === "goal" && (
            <div className="flex flex-1 flex-col">
              <Title sub="Optional. Orbit turns it into small steps.">Anything you&apos;re working toward?</Title>
              {goalAdded ? (
                <p className="mt-6 flex items-center gap-2 rounded-2xl bg-success-soft p-4 font-medium text-success">
                  <Check size={18} aria-hidden /> Added “{goalAdded}”
                </p>
              ) : (
                <>
                  <input
                    aria-label="Your goal"
                    value={goalText}
                    onChange={(e) => setGoalText(e.target.value)}
                    placeholder="Run a 5K next month"
                    className="mt-6 block min-h-12 w-full rounded-2xl border border-line-strong bg-surface px-4 text-[17px]"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {GOAL_EXAMPLES.slice(0, 4).map((g) => (
                      <button key={g} type="button" onClick={() => setGoalText(g)} className="min-h-9 rounded-full bg-sunken px-3.5 text-[14px] text-ink-2 hover:text-ink">
                        {g}
                      </button>
                    ))}
                  </div>
                  {goalPreview && (
                    <div className="mt-5 rounded-2xl bg-surface p-4 shadow-card">
                      <p className="flex items-center gap-2 text-[16px] font-semibold">
                        <span className={cn("h-2 w-2 rounded-full", areaStyle(goalPreview.area).dot)} aria-hidden />
                        {goalPreview.title}
                      </p>
                      <p className="mt-1 text-[14px] text-ink-2">{goalPreview.plan}</p>
                      <ul className="mt-2 space-y-0.5 text-[14px] text-ink-3">
                        {goalPreview.steps.slice(0, 3).map((s) => (
                          <li key={s.id}>
                            {relativeDay(s.date, todayStr())}: {s.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
              <div className="flex-1" />
              {goalPreview && !goalAdded ? (
                <Button
                  variant="primary"
                  size="lg"
                  className="mt-8 w-full"
                  onClick={() => {
                    dispatch({ type: "ADD_GOAL", goal: goalPreview });
                    setGoalAdded(goalPreview.title);
                  }}
                >
                  Start this plan
                </Button>
              ) : (
                <Button variant="primary" size="lg" className="mt-8 w-full" onClick={next}>
                  {goalAdded ? "Continue" : "Not right now"}
                </Button>
              )}
            </div>
          )}

          {id === "ready" && (
            <div className="flex flex-1 flex-col">
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <OrbitMark size={56} spinning className="text-ink" />
                <h1 className="mt-6 text-[32px] leading-tight">Your Orbit is ready</h1>
                <p className="mt-2 text-[16px] text-ink-2">Orbit will keep track of:</p>
                <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
                  {chosenAreas.map((a) => (
                    <li key={a} className="inline-flex items-center gap-1.5 text-[15px]">
                      <span className={cn("h-2 w-2 rounded-full", areaStyle(a).dot)} aria-hidden />
                      {areaLabel(a)}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-[14.5px] text-ink-3">It will keep learning as you go.</p>
              </div>
              <Button variant="primary" size="lg" className="w-full" onClick={() => finish()} data-autofocus>
                Go to Today
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

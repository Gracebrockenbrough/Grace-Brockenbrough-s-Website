"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FileUp, GitCompareArrows, HandHeart, ListChecks, Plug, ShieldCheck, Sparkles } from "lucide-react";
import type { Category } from "@/types";
import { cn } from "@/lib/cn";
import { AREA_LABEL, AREA_ORDER, AREA_STYLE } from "@/lib/areas";
import { relativeDay } from "@/lib/time";
import { DEMO_NOW_STR } from "@/data/demoClock";
import { buildGoal, GOAL_EXAMPLES } from "@/services/goals";
import { useOrbit } from "@/store/OrbitProvider";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/shell/Logo";
import { Modal } from "@/components/ui/Overlay";
import { ConnectFlow } from "@/components/connections/ConnectFlow";
import { ConnectionIcon } from "@/components/connections/ConnectionIcon";
import { Planet, Sun } from "@/components/areas/Planet";

const USER_TYPES = [
  { value: "Undergrad", detail: "Classes, clubs, and figuring it all out" },
  { value: "Student-athlete", detail: "Practice, travel, and classes" },
  { value: "Working student", detail: "Shifts on top of coursework" },
  { value: "Grad student", detail: "Research, teaching, and deadlines" },
  { value: "Recent grad", detail: "New job, new city, new routines" },
];
const YEARS = ["First-year", "Sophomore", "Junior", "Senior", "Other"];
const ROLES = ["Recruiting", "In a club", "On a team", "Working a job", "Greek life", "Studying abroad soon"];

const STARTING_POINTS = [
  "My life is scattered across different places.",
  "I already have a system, but want more help.",
  "I'm new to AI and want to see what it can do.",
  "I use AI for work but want help with my personal life.",
];

const HARDEST = [
  "Keeping track of deadlines",
  "Replying to people",
  "Finding time to study",
  "Staying active",
  "Getting enough sleep",
  "Balancing school and recruiting",
  "Small errands and returns",
  "Keeping up with family",
  "Money",
];

const BRIEF_TIMES = ["7:00 AM", "7:30 AM", "8:00 AM", "9:00 AM", "No brief"];

type StepId = "welcome" | "what" | "you" | "start" | "areas" | "hardest" | "rhythm" | "goal" | "connect" | "courses" | "brief" | "ready";

function Chip({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[15px] transition-colors",
        on ? "border-cream bg-cream text-navy" : "border-line-strong text-ink-2 hover:text-ink",
        className,
      )}
    >
      {on && <Check size={15} strokeWidth={2.5} aria-hidden />}
      {children}
    </button>
  );
}

function Title({ eyebrow, children, sub }: { eyebrow?: string; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      {eyebrow && <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">{eyebrow}</p>}
      <h1 className="text-[32px] leading-tight">{children}</h1>
      {sub && <p className="mt-3 text-[16.5px] text-ink-2">{sub}</p>}
    </div>
  );
}

export default function OnboardingPage() {
  const { state, dispatch } = useOrbit();
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [userType, setUserType] = useState<string | undefined>();
  const [year, setYear] = useState<string | undefined>(state.user.year);
  const [roles, setRoles] = useState<string[]>([]);
  const [startingPoint, setStartingPoint] = useState<string | undefined>();
  const [areas, setAreas] = useState<Category[]>(AREA_ORDER);
  const [hardest, setHardest] = useState<string[]>([]);
  const [focus, setFocus] = useState<string | undefined>();
  const [sleep, setSleep] = useState<string | undefined>();
  const [planning, setPlanning] = useState<"suggest" | "manual" | undefined>();
  const [goalText, setGoalText] = useState("");
  const [goalAdded, setGoalAdded] = useState<string | undefined>();
  const [briefTime, setBriefTime] = useState("8:00 AM");
  // Onboarding tracks its own progress; the demo's sample data loads either way.
  const [linked, setLinked] = useState<string[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const primary = state.sources.filter((s) => s.group === "primary");
  const extraSources = state.sources.filter(
    (s) => (s.id === "src-strava" && areas.includes("wellness")) || (s.id === "src-health" && areas.includes("wellness") && hardest.includes("Getting enough sleep")),
  );
  const [coursePath, setCoursePath] = useState<"none" | "manual">("none");
  const [picked, setPicked] = useState<string[]>(state.courses.map((c) => c.id));

  const isStudent = userType !== "Recent grad";
  const steps: StepId[] = useMemo(
    () => ["welcome", "what", "you", "start", "areas", "hardest", "rhythm", "goal", "connect", ...(isStudent ? (["courses"] as StepId[]) : []), "brief", "ready"],
    [isStudent],
  );
  const id = steps[Math.min(stepIndex, steps.length - 1)];
  const goalPreview = useMemo(() => (goalText.trim() ? buildGoal(goalText, "2026-10-09", DEMO_NOW_STR) : undefined), [goalText]);

  const next = () => setStepIndex((s) => Math.min(s + 1, steps.length - 1));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const saveProfile = () =>
    dispatch({
      type: "SET_PROFILE",
      patch: { userType, roles: [...(year && isStudent ? [year] : []), ...roles], areas, hardest, briefTime: briefTime === "No brief" ? undefined : briefTime },
    });

  const finish = (to = "/today") => {
    saveProfile();
    if (focus) dispatch({ type: "ANSWER_PROFILE", id: "focus", answer: focus });
    if (sleep) dispatch({ type: "ANSWER_PROFILE", id: "sleep", answer: sleep });
    if (planning) dispatch({ type: "SET_DISPLAY_PREF", patch: { planningStyle: planning } });
    if (briefTime === "No brief") dispatch({ type: "SET_NOTIFICATION", key: "morningBrief", value: false });
    dispatch({ type: "COMPLETE_ONBOARDING" });
    router.push(to);
  };

  const pct = Math.round(((stepIndex + 1) / steps.length) * 100);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-5 pt-5 md:px-10">
        <div className="flex items-center justify-between">
          {stepIndex > 0 ? (
            <button type="button" onClick={() => setStepIndex((s) => s - 1)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-[15px] text-ink-2 hover:text-ink">
              <ArrowLeft size={18} aria-hidden /> Back
            </button>
          ) : (
            <span />
          )}
          <span className="text-[13px] text-ink-3">
            {stepIndex + 1} of {steps.length}
          </span>
          {id !== "ready" ? (
            <button type="button" onClick={() => finish()} className="min-h-10 rounded-xl px-2 text-[15px] text-ink-3 hover:text-ink">
              Skip
            </button>
          ) : (
            <span />
          )}
        </div>
        <div className="mx-auto mt-3 h-1 max-w-md overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
          <div className="h-full rounded-full bg-cream transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
        <div key={id} className="animate-rise-in">
          {id === "welcome" && (
            <div className="text-center">
              <div className="relative mx-auto mb-10 flex h-56 w-56 items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-dashed border-line-strong" aria-hidden />
                <span className="absolute inset-8 rounded-full border border-line" aria-hidden />
                <Sun size={84}>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">You</span>
                </Sun>
                {AREA_ORDER.map((a, i) => {
                  const angle = (i / AREA_ORDER.length) * Math.PI * 2 - Math.PI / 2;
                  return (
                    <span key={a} className="absolute" style={{ left: `calc(50% + ${Math.cos(angle) * 112}px - 13px)`, top: `calc(50% + ${Math.sin(angle) * 112}px - 13px)` }}>
                      <Planet area={a} size={26} />
                    </span>
                  );
                })}
              </div>
              <Logo size="lg" className="justify-center" />
              <h1 className="mt-6 text-[34px] leading-tight">Your whole life, in one orbit.</h1>
              <p className="mt-4 text-[17px] text-ink-2">Chatbots wait for you to ask. ORBIT notices.</p>
              <Button variant="primary" size="lg" className="mt-10 w-full" onClick={next} data-autofocus>
                Get started
              </Button>
              <p className="mt-3 text-[13.5px] text-ink-3">About 3 minutes. Every question is optional.</p>
            </div>
          )}

          {id === "what" && (
            <div>
              <Title eyebrow="How it works">What ORBIT does</Title>
              <ul className="mt-8 space-y-5">
                {[
                  { icon: Plug, title: "Brings everything in", body: "Calendar, email, classes, chats — or just speak, snap a photo, or drop a screenshot." },
                  { icon: GitCompareArrows, title: "Notices what changed", body: "Moved exams, conflicts, people waiting on you." },
                  { icon: ListChecks, title: "Shows what matters", body: "A few things a day, sorted into the parts of your life." },
                  { icon: Sparkles, title: "Turns goals into steps", body: "“Run a 5K next month” becomes a plan you can check off." },
                  { icon: ShieldCheck, title: "Never acts for you", body: "ORBIT drafts and suggests. It never sends, submits, buys, or cancels anything." },
                ].map(({ icon: Icon, title, body }) => (
                  <li key={title} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent" aria-hidden>
                      <Icon size={20} />
                    </span>
                    <span>
                      <span className="block font-semibold">{title}</span>
                      <span className="block text-[15px] text-ink-2">{body}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Button variant="primary" size="lg" className="mt-10 w-full" onClick={next}>
                Continue
              </Button>
            </div>
          )}

          {id === "you" && (
            <div>
              <Title eyebrow="A little about you" sub="So ORBIT plans for your actual life.">
                Hi {state.user.name}. What best describes you?
              </Title>
              <div role="radiogroup" aria-label="What best describes you?" className="mt-7 space-y-2">
                {USER_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={userType === t.value}
                    onClick={() => setUserType(t.value)}
                    className={cn("flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors", userType === t.value ? "border-accent bg-accent-soft/60" : "border-line bg-surface hover:border-line-strong")}
                  >
                    <span className={cn("h-5 w-5 shrink-0 rounded-full border-2", userType === t.value ? "border-[6px] border-accent" : "border-line-strong")} aria-hidden />
                    <span>
                      <span className="block text-[16px] font-medium">{t.value}</span>
                      <span className="block text-[13.5px] text-ink-3">{t.detail}</span>
                    </span>
                  </button>
                ))}
              </div>
              {isStudent && (
                <>
                  <p className="mb-2 mt-6 text-[14px] font-medium text-ink-2">Year</p>
                  <div className="flex flex-wrap gap-2">
                    {YEARS.map((y) => (
                      <Chip key={y} on={year === y} onClick={() => setYear(y)}>{y}</Chip>
                    ))}
                  </div>
                </>
              )}
              <p className="mb-2 mt-6 text-[14px] font-medium text-ink-2">I&apos;m also… <span className="font-normal text-ink-3">(pick any)</span></p>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => (
                  <Chip key={r} on={roles.includes(r)} onClick={() => setRoles((x) => toggle(x, r))}>{r}</Chip>
                ))}
              </div>
              <Button variant="primary" size="lg" className="mt-8 w-full" onClick={next}>
                Continue
              </Button>
            </div>
          )}

          {id === "start" && (
            <div>
              <Title eyebrow="A little about you" sub="There's no wrong answer. It helps ORBIT know where to begin.">
                Where are you starting from?
              </Title>
              <div role="radiogroup" aria-label="Where are you starting from?" className="mt-7 space-y-2.5">
                {STARTING_POINTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={startingPoint === p}
                    onClick={() => setStartingPoint(p)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border p-4 text-left text-[16px] transition-colors",
                      startingPoint === p ? "border-accent bg-accent-soft/60" : "border-line bg-surface hover:border-line-strong",
                    )}
                  >
                    <span className={cn("h-5 w-5 shrink-0 rounded-full border-2", startingPoint === p ? "border-[6px] border-accent" : "border-line-strong")} aria-hidden />
                    {p}
                  </button>
                ))}
              </div>
              <Button
                variant="primary"
                size="lg"
                className="mt-8 w-full"
                onClick={() => {
                  if (startingPoint) dispatch({ type: "SET_DISPLAY_PREF", patch: { startingPoint } });
                  next();
                }}
              >
                Continue
              </Button>
              <button type="button" onClick={next} className="mt-3 min-h-10 w-full text-[15px] text-ink-3 hover:text-ink">
                Skip this question
              </button>
            </div>
          )}

          {id === "areas" && (
            <div>
              <Title eyebrow="Your orbit" sub="Each one becomes a planet with its own color. You can see them together or one at a time.">
                Which parts of life should ORBIT watch?
              </Title>
              <div className="mt-7 grid grid-cols-2 gap-2.5">
                {AREA_ORDER.map((a) => {
                  const on = areas.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setAreas((x) => toggle(x, a))}
                      className={cn("flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all", on ? `${AREA_STYLE[a].border} ${AREA_STYLE[a].soft}` : "border-line bg-surface opacity-60 hover:opacity-100")}
                    >
                      <Planet area={a} size={34} />
                      <span className="min-w-0">
                        <span className="block text-[16px] font-semibold">{AREA_LABEL[a]}</span>
                        <span className="block text-[12.5px] leading-tight text-ink-3">{AREA_STYLE[a].blurb}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <Button variant="primary" size="lg" className="mt-8 w-full" onClick={next} disabled={!areas.length}>
                Continue with {areas.length} {areas.length === 1 ? "planet" : "planets"}
              </Button>
            </div>
          )}

          {id === "hardest" && (
            <div>
              <Title eyebrow="So ORBIT can help" sub="Pick as many as you want. ORBIT will watch these most closely.">
                What&apos;s hardest to keep up with right now?
              </Title>
              <div className="mt-7 flex flex-wrap gap-2">
                {HARDEST.map((h) => (
                  <Chip key={h} on={hardest.includes(h)} onClick={() => setHardest((x) => toggle(x, h))}>{h}</Chip>
                ))}
              </div>
              <Button variant="primary" size="lg" className="mt-8 w-full" onClick={next}>
                Continue
              </Button>
            </div>
          )}

          {id === "rhythm" && (
            <div>
              <Title eyebrow="Your rhythm" sub="ORBIT uses this to suggest what to do with free time.">
                How do your days usually go?
              </Title>
              <p className="mb-2 mt-7 text-[14px] font-medium text-ink-2">I focus best in the…</p>
              <div className="flex flex-wrap gap-2">
                {["Morning", "Afternoon", "Night"].map((f) => (
                  <Chip key={f} on={focus === f} onClick={() => setFocus(f)}>{f}</Chip>
                ))}
              </div>
              <p className="mb-2 mt-6 text-[14px] font-medium text-ink-2">I usually go to sleep…</p>
              <div className="flex flex-wrap gap-2">
                {["Before 11", "11 to midnight", "After midnight"].map((f) => (
                  <Chip key={f} on={sleep === f} onClick={() => setSleep(f)}>{f}</Chip>
                ))}
              </div>
              <p className="mb-2 mt-6 text-[14px] font-medium text-ink-2">When I have free time, ORBIT should…</p>
              <div className="space-y-2">
                {[
                  { v: "suggest" as const, label: "Suggest what to do with it", detail: "Study, a run, an errand — you pick" },
                  { v: "manual" as const, label: "Just show it to me", detail: "I'll decide what to do" },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    role="radio"
                    aria-checked={planning === o.v}
                    onClick={() => setPlanning(o.v)}
                    className={cn("flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left", planning === o.v ? "border-accent bg-accent-soft/60" : "border-line bg-surface hover:border-line-strong")}
                  >
                    <span className={cn("h-5 w-5 shrink-0 rounded-full border-2", planning === o.v ? "border-[6px] border-accent" : "border-line-strong")} aria-hidden />
                    <span>
                      <span className="block text-[15.5px] font-medium">{o.label}</span>
                      <span className="block text-[13.5px] text-ink-3">{o.detail}</span>
                    </span>
                  </button>
                ))}
              </div>
              <Button variant="primary" size="lg" className="mt-8 w-full" onClick={next}>
                Continue
              </Button>
            </div>
          )}

          {id === "goal" && (
            <div>
              <Title eyebrow="Something to work toward" sub="Say it like you'd tell a friend. ORBIT breaks it into small steps.">
                Is there a goal you want to start on?
              </Title>
              {goalAdded ? (
                <div className="mt-7 rounded-2xl border border-success/40 bg-success-soft p-4">
                  <p className="flex items-center gap-2 font-semibold text-success"><Check size={18} aria-hidden /> Added “{goalAdded}”</p>
                  <p className="mt-1 text-[14.5px] text-ink-2">You&apos;ll find it on its planet, and today&apos;s step on Today.</p>
                </div>
              ) : (
                <>
                  <label htmlFor="onb-goal" className="sr-only">Your goal</label>
                  <input
                    id="onb-goal"
                    value={goalText}
                    onChange={(e) => setGoalText(e.target.value)}
                    placeholder="Run a 5K next month"
                    className="mt-7 block min-h-12 w-full rounded-2xl border border-line-strong bg-surface px-4 text-[17px]"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {GOAL_EXAMPLES.slice(0, 4).map((g) => (
                      <button key={g} type="button" onClick={() => setGoalText(g)} className="min-h-9 rounded-full border border-line-strong px-3.5 text-[14px] text-ink-2 hover:text-ink">
                        {g}
                      </button>
                    ))}
                  </div>
                  {goalPreview && (
                    <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
                      <div className="flex items-center gap-3">
                        <Planet area={goalPreview.area} size={30} />
                        <div className="min-w-0">
                          <p className={cn("text-[12px] font-semibold uppercase tracking-[0.12em]", AREA_STYLE[goalPreview.area].text)}>{AREA_LABEL[goalPreview.area]}</p>
                          <p className="font-display text-[19px] leading-snug">{goalPreview.title}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-[14.5px] text-ink-2">{goalPreview.plan}</p>
                      <ul className="mt-3 space-y-1 text-[14px] text-ink-2">
                        {goalPreview.steps.slice(0, 3).map((s) => (
                          <li key={s.id} className="flex gap-2">
                            <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full border border-line-strong" aria-hidden />
                            {relativeDay(s.date, "2026-10-09")}: {s.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
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
                  Continue
                </Button>
              )}
              {!goalAdded && (
                <button type="button" onClick={next} className="mt-3 min-h-10 w-full text-[15px] text-ink-3 hover:text-ink">
                  Not right now
                </button>
              )}
            </div>
          )}

          {id === "connect" && (
            <div>
              <h1 className="text-[32px] leading-tight">Connect the places where your life already happens</h1>
              <p className="mt-3 text-[17px] text-ink-2">You don&apos;t need to organize anything. ORBIT does that part.</p>
              <ul className="mt-7 space-y-2.5">
                {[...primary, ...extraSources].map((src) => {
                  const done = linked.includes(src.id);
                  return (
                    <li key={src.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-card">
                      <ConnectionIcon source={{ ...src, status: done ? "connected" : "available" }} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{src.name}</p>
                        <p className="text-[14px] leading-snug text-ink-3">{src.blurb}</p>
                      </div>
                      {done ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-[14.5px] font-medium text-success">
                          <Check size={16} aria-hidden /> Connected
                        </span>
                      ) : (
                        <Button size="sm" variant="secondary" className="shrink-0" onClick={() => setConnectingId(src.id)}>
                          Connect
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <Button variant="primary" size="lg" className="mt-8 w-full" onClick={next}>
                Continue
              </Button>
              <button type="button" onClick={next} className="mt-3 w-full min-h-10 text-[15px] text-ink-3 hover:text-ink">
                I&apos;d rather add things myself
              </button>
              <p className="text-center text-[13.5px] text-ink-3">No accounts needed. Only what you choose to add.</p>
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

          {id === "courses" && (
            <div>
              <h1 className="text-[32px] leading-tight">Add your classes</h1>
              <p className="mt-3 text-[17px] text-ink-2">Upload a syllabus and ORBIT will find every assignment and exam date for you to confirm.</p>
              {coursePath === "none" ? (
                <div className="mt-8 space-y-3">
                  <button
                    type="button"
                    onClick={() => finish("/courses/upload?from=onboarding")}
                    className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left shadow-card hover:border-accent-line"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent" aria-hidden>
                      <FileUp size={22} />
                    </span>
                    <span>
                      <span className="block font-semibold">Upload syllabus</span>
                      <span className="block text-[14px] text-ink-3">PDF, Word, or a photo</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoursePath("manual")}
                    className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left shadow-card hover:border-line-strong"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sunken" aria-hidden>
                      <ListChecks size={22} />
                    </span>
                    <span>
                      <span className="block font-semibold">Add manually</span>
                      <span className="block text-[14px] text-ink-3">Pick from the classes on your schedule</span>
                    </span>
                  </button>
                  <Button variant="ghost" className="w-full" onClick={next}>
                    Later
                  </Button>
                </div>
              ) : (
                <div className="mt-6">
                  <p className="mb-3 text-[15px] font-medium text-ink-2">ORBIT found these classes on your calendar:</p>
                  <ul className="space-y-2">
                    {state.courses.map((c) => {
                      const on = picked.includes(c.id);
                      return (
                        <li key={c.id}>
                          <label className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5", on ? "border-accent bg-accent-soft/50" : "border-line bg-surface")}>
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => setPicked((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))}
                              className="h-4 w-4 accent-[var(--color-accent)]"
                            />
                            <span>
                              <span className="block font-semibold">{c.code} · {c.name}</span>
                              <span className="block text-[14px] text-ink-3">{c.professor}</span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <Button variant="primary" size="lg" className="mt-8 w-full" onClick={next} disabled={!picked.length}>
                    Add {picked.length} {picked.length === 1 ? "course" : "courses"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {id === "brief" && (
            <div>
              <Title eyebrow="Your mornings" sub="One short summary: what matters, what changed, and when you're free.">
                When should your morning brief arrive?
              </Title>
              <div className="mt-7 flex flex-wrap gap-2">
                {BRIEF_TIMES.map((t) => (
                  <Chip key={t} on={briefTime === t} onClick={() => setBriefTime(t)}>{t}</Chip>
                ))}
              </div>
              <Button variant="primary" size="lg" className="mt-8 w-full" onClick={next}>
                Continue
              </Button>
            </div>
          )}

          {id === "ready" && (
            <div className="text-center">
              <div className="relative mx-auto mb-8 flex h-48 w-48 items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-dashed border-line-strong" aria-hidden />
                <Sun size={72}>
                  <HandHeart size={26} aria-hidden />
                </Sun>
                {areas.map((a, i) => {
                  const angle = (i / areas.length) * Math.PI * 2 - Math.PI / 2;
                  return (
                    <span key={a} className="absolute animate-rise-in" style={{ left: `calc(50% + ${Math.cos(angle) * 96}px - 12px)`, top: `calc(50% + ${Math.sin(angle) * 96}px - 12px)`, animationDelay: `${i * 90}ms` }}>
                      <Planet area={a} size={24} />
                    </span>
                  );
                })}
              </div>
              <h1 className="text-[34px] leading-tight">Your orbit is ready</h1>
              <p className="mt-3 text-[16.5px] text-ink-2">
                ORBIT will watch {areas.length === AREA_ORDER.length ? "every part of your life" : areas.map((a) => AREA_LABEL[a]).join(", ")}
                {hardest.length ? `, with extra care for ${hardest.slice(0, 2).map((h) => h.toLowerCase()).join(" and ")}` : ""}.
              </p>
              <p className="mt-2 text-[14.5px] text-ink-3">It&apos;ll keep asking small questions as it gets to know you.</p>
              <Button variant="primary" size="lg" className="mt-10 w-full" onClick={() => finish()} data-autofocus>
                Go to Today
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

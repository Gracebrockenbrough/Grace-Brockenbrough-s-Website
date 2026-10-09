"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, FileUp, Bell, GitCompareArrows, ListChecks } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOrbit } from "@/store/OrbitProvider";
import { Button } from "@/components/ui/Button";
import { Logo, OrbitMark } from "@/components/shell/Logo";

const STEPS = 5;

export default function OnboardingPage() {
  const { state, dispatch } = useOrbit();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [coursePath, setCoursePath] = useState<"none" | "manual">("none");
  const [picked, setPicked] = useState<string[]>(state.courses.map((c) => c.id));

  const next = () => setStep((s) => Math.min(s + 1, STEPS - 1));
  const finish = (to = "/today") => {
    dispatch({ type: "COMPLETE_ONBOARDING" });
    router.push(to);
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex items-center justify-between px-5 py-5 md:px-10">
        {step > 0 ? (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-[15px] text-ink-2 hover:text-ink">
            <ArrowLeft size={18} aria-hidden /> Back
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-ink" : i < step ? "w-1.5 bg-ink/60" : "w-1.5 bg-line-strong")} />
          ))}
        </div>
        {step < STEPS - 1 ? (
          <button type="button" onClick={() => finish()} className="min-h-10 rounded-xl px-2 text-[15px] text-ink-3 hover:text-ink">
            Skip
          </button>
        ) : (
          <span />
        )}
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16">
        <div key={step} className="animate-rise-in">
          {step === 0 && (
            <div className="text-center">
              <div className="mb-8 flex justify-center">
                <Logo size="lg" />
              </div>
              <h1 className="text-[30px] font-semibold leading-tight tracking-tight">Your life, organized around what matters.</h1>
              <p className="mt-4 text-[17px] text-ink-2">Chatbots wait for you to ask. ORBIT notices.</p>
              <Button variant="primary" size="lg" className="mt-10 w-full" onClick={next} data-autofocus>
                Get started
              </Button>
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="text-[28px] font-semibold leading-tight tracking-tight">What ORBIT does</h1>
              <p className="mt-3 text-[17px] text-ink-2">Connect your schedule, courses, and important information. ORBIT notices deadlines, conflicts, and things you may have forgotten.</p>
              <ul className="mt-8 space-y-4">
                {[
                  { icon: ListChecks, title: "Shows what matters today", body: "Three to five priorities, not a hundred tasks." },
                  { icon: GitCompareArrows, title: "Notices when things change", body: "Moved exams, overlapping plans, unanswered emails." },
                  { icon: Bell, title: "Speaks up only when it should", body: "Quiet by default. Never sends anything without you." },
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

          {step === 2 && (
            <div>
              <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Start with your calendar</h1>
              <p className="mt-3 text-[17px] text-ink-2">ORBIT reads your schedule to find free time and conflicts. It never changes an event without asking.</p>
              <div className="mt-8 flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sunken" aria-hidden>
                  <CalendarDays size={22} />
                </span>
                <div className="flex-1">
                  <p className="font-semibold">Google Calendar</p>
                  <p className="text-[14px] text-ink-3">{connected ? "Connected · 2 calendars" : "Demo connection"}</p>
                </div>
                {connected ? (
                  <span className="inline-flex items-center gap-1.5 text-[14.5px] font-medium text-success">
                    <Check size={17} aria-hidden /> Connected
                  </span>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={connecting}
                    onClick={() => {
                      setConnecting(true);
                      window.setTimeout(() => {
                        setConnecting(false);
                        setConnected(true);
                      }, 900);
                    }}
                  >
                    {connecting ? "Connecting…" : "Connect"}
                  </Button>
                )}
              </div>
              <p className="mt-3 text-[13.5px] text-ink-3">This prototype uses sample data. No real account is connected.</p>
              <Button variant="primary" size="lg" className="mt-10 w-full" onClick={next} disabled={connecting}>
                {connected ? "Continue" : "Skip for demo"}
              </Button>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Add your courses</h1>
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

          {step === 4 && (
            <div className="text-center">
              <div className="mb-8 flex justify-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft text-ink">
                  <OrbitMark size={44} spinning />
                </span>
              </div>
              <h1 className="text-[30px] font-semibold leading-tight tracking-tight">You&apos;re ready</h1>
              <p className="mt-3 text-[17px] text-ink-2">ORBIT will start organizing what matters.</p>
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

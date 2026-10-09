"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FileUp, GitCompareArrows, ListChecks, Plug, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOrbit } from "@/store/OrbitProvider";
import { Button } from "@/components/ui/Button";
import { Logo, OrbitMark } from "@/components/shell/Logo";
import { Modal } from "@/components/ui/Overlay";
import { ConnectFlow } from "@/components/connections/ConnectFlow";
import { ConnectionIcon } from "@/components/connections/ConnectionIcon";

const STEPS = 5;

export default function OnboardingPage() {
  const { state, dispatch } = useOrbit();
  const router = useRouter();
  const [step, setStep] = useState(0);
  // Onboarding tracks its own progress; the demo's sample data loads either way.
  const [linked, setLinked] = useState<string[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const primary = state.sources.filter((s) => s.group === "primary");
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
              <ul className="mt-8 space-y-4">
                {[
                  { icon: Plug, title: "Connects to your life", body: "Calendar, email, classes, and group chats." },
                  { icon: GitCompareArrows, title: "Notices what changed", body: "Moved exams, conflicts, people waiting on you." },
                  { icon: ListChecks, title: "Shows what matters", body: "A few things a day, not a hundred." },
                  { icon: Sparkles, title: "Learns what matters to you", body: "It gets quieter and sharper as you use it." },
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
              <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Connect the places where your life already happens</h1>
              <p className="mt-3 text-[17px] text-ink-2">You don&apos;t need to organize anything. ORBIT does that part.</p>
              <ul className="mt-7 space-y-2.5">
                {primary.map((src) => {
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
                I&apos;ll do this later
              </button>
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
              <p className="mt-3 text-[17px] text-ink-2">ORBIT will start organizing what matters. You can add connections anytime from your profile.</p>
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

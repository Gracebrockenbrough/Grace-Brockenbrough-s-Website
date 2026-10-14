"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { relativeDay } from "@/lib/time";
import { useRouter } from "next/navigation";
import { ArrowUp, Check, Mic } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { useLoopActions, usePlanBlock, snoozeOptions } from "@/store/useActions";
import { answerQuestion, type AskAction, type AskAnswer } from "@/services/ask";
import { OrbitMark } from "@/components/shell/Logo";
import { RightNow } from "@/components/ask/RightNow";
import { useSession } from "@/store/SessionProvider";
import { lifeSnapshot, ORBIT_VOICE } from "@/services/aiContext";

interface Turn {
  id: number;
  question: string;
  answer?: AskAnswer;
  used: string[];
}

let turnId = 0;

export default function AskPage() {
  const { state, derived, dispatch } = useOrbit();
  const session = useSession();
  const { open, notify } = useUI();
  const loopActions = useLoopActions();
  const plan = usePlanBlock();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const thinking = turns.some((t) => !t.answer);
  const [moreIdeas, setMoreIdeas] = useState(false);
  const [listening, setListening] = useState(false);

  /** Voice is simulated in the prototype: it "hears" one of a few common questions. */
  function speak() {
    const phrase = ["What's coming up?", "Did anything change?", "What should I do tonight?"][turns.length % 3];
    setListening(true);
    setInput("");
    phrase.split(" ").forEach((_, i, words) => window.setTimeout(() => setInput(words.slice(0, i + 1).join(" ")), 250 + i * 160));
    window.setTimeout(() => {
      setListening(false);
      ask(phrase);
    }, 450 + phrase.split(" ").length * 160);
  }
  // Personalized: time of day first, then what this person actually asks.
  const suggestions = derived.learned.askSuggestions;
  // Questions written from the user's actual week, so it's obvious what Orbit can do.
  const contextual = useMemo(() => {
    const qs: string[] = [];
    const exam = derived.study[0]?.exam ?? derived.upcomingItems.find((i) => i.kind === "exam");
    if (exam?.date) qs.push(`When should I study for ${relativeDay(exam.date, derived.today)}'s exam?`);
    qs.push(derived.changes.length ? "What changed since yesterday?" : "What am I forgetting?");
    qs.push("Do I actually have time for everything this week?");
    const big = derived.priorities.find((l) => (l.effortMinutes ?? 0) >= 45 && !l.requiresResponse);
    if (big) qs.push(`Find 2 hours for my ${big.title.charAt(0).toLowerCase()}${big.title.slice(1)}`);
    if (!qs.includes("What am I forgetting?")) qs.push("What am I forgetting?");
    return qs.slice(0, 5);
  }, [derived]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  function ask(question: string) {
    const q = question.trim();
    if (!q || thinking) return;
    const id = ++turnId;
    setTurns((t) => [...t, { id, question: q, used: [] }]);
    dispatch({ type: "SIGNAL", signal: { itemType: "ask", action: "ask", context: { q } } });
    setInput("");
    const local = answerQuestion(q, state, derived);
    // Built-in answers carry actions; anything they can't answer goes to Orbit's AI when this copy has one.
    if (local.fallback && session.ai) {
      const history = turns.slice(-4).filter((t) => t.answer).map((t) => `Earlier they asked: ${t.question}\nYou answered: ${t.answer!.intro}`).join("\n\n");
      const prompt = `${ORBIT_VOICE}\n\n--- Their life ---\n${lifeSnapshot(state, derived)}${history ? `\n\n--- Conversation so far ---\n${history}` : ""}\n\n--- Question ---\n${q}`;
      session.ai
        .ask(prompt)
        .then((text) => setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer: { intro: text.trim() } } : x))))
        .catch(() =>
          setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer: { ...local, intro: "I couldn't reach Orbit's AI just now. " + local.intro } } : x))),
        );
      return;
    }
    // A short, visible "thinking" beat. Answers are computed from live state.
    window.setTimeout(() => {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer: local } : x)));
    }, 600);
  }

  function run(turn: Turn, action: AskAction) {
    switch (action.kind) {
      case "complete":
        loopActions.complete(action.loopId);
        break;
      case "snooze":
        { const o = snoozeOptions()[0]; loopActions.snooze(action.loopId, o.until, o.label); }
        break;
      case "open_loop":
        open({ type: "loop", id: action.loopId });
        return;
      case "open_message":
        open({ type: "message", id: action.messageId });
        return;
      case "review_change":
        open({ type: "change", id: action.changeId });
        return;
      case "review_conflict":
        open({ type: "conflict", id: action.conflictId });
        return;
      case "add_block":
        plan({ title: action.title, date: action.date, start: action.start, end: action.end, courseId: action.courseId, loopId: action.loopId, examId: action.examId });
        break;
      case "ignore_source":
        dispatch({ type: "IGNORE_SOURCE", key: action.key, label: action.sourceLabel });
        notify(`Orbit will ignore ${action.sourceLabel}.`, { undoable: true });
        break;
      case "navigate":
        router.push(action.href);
        return;
    }
    setTurns((t) => t.map((x) => (x.id === turn.id ? { ...x, used: [...x.used, action.label] } : x)));
  }

  return (
    <div className="flex min-h-[calc(var(--app-h)-11rem)] flex-col">
      <header className="mb-5 px-1 pt-2">
        <h1 className="text-[34px] leading-tight">{turns.length ? "Ask Orbit" : "Here’s where things stand"}</h1>
      </header>

      {turns.length === 0 ? (
        <div className="flex-1 space-y-6">
          <RightNow />
          <section aria-labelledby="try-asking">
            <h2 id="try-asking" className="mb-2 px-1 text-[15px] font-semibold text-ink-2">Try asking</h2>
            <ul className="divide-y divide-line rounded-2xl bg-surface shadow-card">
              {(moreIdeas ? [...contextual, ...suggestions.filter((q) => !contextual.includes(q))] : contextual).map((q) => (
                <li key={q}>
                  <button type="button" onClick={() => ask(q)} className="flex min-h-12 w-full items-center px-4 py-2.5 text-left text-[15.5px] text-ink">
                    {q}
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => open({ type: "compose" })} className="flex min-h-12 w-full items-center px-4 py-2.5 text-left text-[15.5px] text-ink">
                  Help me write a text or email
                </button>
              </li>
            </ul>
            {!moreIdeas && (
              <button type="button" onClick={() => setMoreIdeas(true)} className="mt-1.5 min-h-9 px-1 text-[14.5px] font-medium text-accent">
                More questions
              </button>
            )}
          </section>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2 rounded-full border border-line-strong bg-surface p-1.5 pl-5 focus-within:border-accent"
          >
            <label htmlFor="ask-first" className="sr-only">Ask Orbit</label>
            <input
              id="ask-first"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your week"
              autoComplete="off"
              className="min-h-11 min-w-0 flex-1 bg-transparent text-[16px] placeholder:text-ink-3 focus:outline-none focus-visible:outline-none"
            />
<button type="button" aria-label="Speak (simulated)" onClick={speak} disabled={thinking || listening} className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 hover:bg-sunken", listening && "animate-pulse-soft text-accent")}>
              <Mic size={19} aria-hidden />
            </button>
            <button type="submit" aria-label="Ask" disabled={!input.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-40">
              <ArrowUp size={20} aria-hidden />
            </button>
          </form>
        </div>
      ) : (
        <ol className="flex-1 space-y-6" aria-live="polite">
          {turns.map((t) => (
            <li key={t.id} className="space-y-3">
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15.5px] text-on-primary">{t.question}</p>
              </div>
              <div className="flex gap-3">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink shadow-card" aria-hidden>
                  <OrbitMark size={20} spinning={!t.answer} />
                </span>
                {t.answer ? (
                  <div className="min-w-0 max-w-[90%] animate-rise-in rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3.5 shadow-card">
                    <p className="whitespace-pre-line text-[15.5px] leading-relaxed text-ink">{t.answer.intro}</p>
                    {t.answer.items && (
                      <ol className="mt-2 space-y-1.5">
                        {t.answer.items.map((item, i) => (
                          <li key={i} className="flex gap-2.5 text-[15.5px] leading-relaxed">
                            <span className="w-4 shrink-0 font-semibold text-accent">{i + 1}.</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {t.answer.outro && <p className="mt-2 text-[15.5px] leading-relaxed text-ink-2">{t.answer.outro}</p>}
                    {t.answer.actions && t.answer.actions.length > 0 && (
                      <div className="mt-3.5 flex flex-wrap gap-2">
                        {t.answer.actions.map((a) => {
                          const used = t.used.includes(a.label);
                          return (
                            <button
                              key={a.label}
                              type="button"
                              disabled={used}
                              onClick={() => run(t, a)}
                              className={cn(
                                "inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 text-[14px] font-medium transition-colors",
                                used ? "border-success/30 bg-success-soft text-success" : "border-line-strong bg-surface text-ink hover:bg-sunken",
                              )}
                            >
                              {used && <Check size={14} aria-hidden />}
                              {a.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="pt-2 text-[15px] text-ink-3">
                    <span className="animate-pulse-soft">Looking across your calendar, courses, and messages…</span>
                  </p>
                )}
              </div>
            </li>
          ))}
          <div ref={bottomRef} />
        </ol>
      )}

      {turns.length > 0 && (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] -mx-5 mt-8 bg-gradient-to-t from-canvas from-70% to-transparent px-5 pb-3 pt-6 lg:bottom-[5rem]"
      >
        {turns.length > 0 && (
          <div className="no-scrollbar -mx-5 mb-2 flex gap-2 overflow-x-auto px-5">
            {suggestions.filter((q) => !turns.some((t) => t.question === q)).slice(0, 3).map((q) => (
              <button key={q} type="button" onClick={() => ask(q)} className="min-h-9 shrink-0 rounded-full border border-line bg-surface px-3 text-[14px] text-ink-2 hover:text-ink">
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 rounded-full border border-line-strong bg-surface p-1.5 pl-5">
          <label htmlFor="ask-input" className="sr-only">Ask Orbit</label>
          <input
            id="ask-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your week"
            className="min-h-10 flex-1 bg-transparent text-[16px] placeholder:text-ink-3 focus:outline-none focus-visible:outline-none"
            autoComplete="off"
          />
<button type="button" aria-label="Speak (simulated)" onClick={speak} disabled={thinking || listening} className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 hover:bg-sunken", listening && "animate-pulse-soft text-accent")}>
            <Mic size={19} aria-hidden />
          </button>
          <button type="submit" aria-label="Ask" disabled={!input.trim() || thinking} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-40">
            <ArrowUp size={19} aria-hidden />
          </button>
        </div>
      </form>
      )}
    </div>
  );
}

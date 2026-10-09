"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { useLoopActions, usePlanBlock, SNOOZE_OPTIONS } from "@/store/useActions";
import { answerQuestion, type AskAction, type AskAnswer } from "@/services/ask";
import { OrbitMark } from "@/components/shell/Logo";

interface Turn {
  id: number;
  question: string;
  answer?: AskAnswer;
  used: string[];
}

let turnId = 0;

export default function AskPage() {
  const { state, derived, dispatch } = useOrbit();
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
  // Personalized: time of day first, then what this person actually asks.
  const suggestions = derived.learned.askSuggestions;

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
    // A short, visible "thinking" beat. Answers are computed from live state.
    window.setTimeout(() => {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer: answerQuestion(q, state, derived) } : x)));
    }, 700);
  }

  function run(turn: Turn, action: AskAction) {
    switch (action.kind) {
      case "complete":
        loopActions.complete(action.loopId);
        break;
      case "snooze":
        loopActions.snooze(action.loopId, SNOOZE_OPTIONS[0].until, SNOOZE_OPTIONS[0].label);
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
        notify(`ORBIT will ignore ${action.sourceLabel}.`, { undoable: true });
        break;
      case "navigate":
        router.push(action.href);
        return;
    }
    setTurns((t) => t.map((x) => (x.id === turn.id ? { ...x, used: [...x.used, action.label] } : x)));
  }

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col">
      <header className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-tight md:text-[32px]">Ask ORBIT</h1>
        <p className="mt-1 text-[15.5px] text-ink-2">Ask about your schedule, classes, tasks, and messages.</p>
      </header>

      {turns.length === 0 ? (
        <div className="flex-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2 rounded-2xl border border-line-strong bg-surface p-2 pl-5 shadow-raised focus-within:border-accent"
          >
            <label htmlFor="ask-first" className="sr-only">Ask ORBIT</label>
            <input
              id="ask-first"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What am I forgetting this week?"
              autoComplete="off"
              className="min-h-12 flex-1 bg-transparent text-[18px] placeholder:text-ink-3 focus:outline-none focus-visible:outline-none"
            />
            <button type="submit" aria-label="Ask" disabled={!input.trim()} className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white disabled:opacity-40">
              <ArrowUp size={20} aria-hidden />
            </button>
          </form>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {(moreIdeas ? suggestions : suggestions.slice(0, 4)).map((q) => (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => ask(q)}
                  className="flex min-h-12 w-full items-center rounded-2xl border border-line bg-surface px-4 text-left text-[15.5px] text-ink hover:border-accent-line hover:bg-accent-soft/40"
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
          {!moreIdeas && (
            <button type="button" onClick={() => setMoreIdeas(true)} className="mt-3 min-h-9 rounded-lg px-1 text-[14.5px] font-medium text-ink-2 hover:text-ink">
              More ideas →
            </button>
          )}
        </div>
      ) : (
        <ol className="flex-1 space-y-6" aria-live="polite">
          {turns.map((t) => (
            <li key={t.id} className="space-y-3">
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[15.5px] text-white">{t.question}</p>
              </div>
              <div className="flex gap-3">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink shadow-card" aria-hidden>
                  <OrbitMark size={20} spinning={!t.answer} />
                </span>
                {t.answer ? (
                  <div className="min-w-0 max-w-[90%] animate-rise-in rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3.5 shadow-card">
                    <p className="text-[15.5px] leading-relaxed text-ink">{t.answer.intro}</p>
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
        className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 mt-8 bg-gradient-to-t from-canvas from-70% to-transparent px-4 pb-3 pt-6 md:bottom-0 md:mx-0 md:px-0 md:pb-6"
      >
        {turns.length > 0 && (
          <div className="no-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
            {suggestions.filter((q) => !turns.some((t) => t.question === q)).slice(0, 3).map((q) => (
              <button key={q} type="button" onClick={() => ask(q)} className="min-h-9 shrink-0 rounded-full border border-line bg-surface px-3 text-[14px] text-ink-2 hover:text-ink">
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 rounded-2xl border border-line-strong bg-surface p-1.5 pl-4 shadow-raised md:mr-0 mr-16">
          <label htmlFor="ask-input" className="sr-only">Ask ORBIT</label>
          <input
            id="ask-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What am I forgetting this week?"
            className="min-h-10 flex-1 bg-transparent text-[16px] placeholder:text-ink-3 focus:outline-none focus-visible:outline-none"
            autoComplete="off"
          />
          <button type="submit" aria-label="Ask" disabled={!input.trim() || thinking} className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white disabled:opacity-40">
            <ArrowUp size={19} aria-hidden />
          </button>
        </div>
      </form>
      )}
    </div>
  );
}

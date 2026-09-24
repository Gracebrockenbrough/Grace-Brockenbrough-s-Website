import { Send, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ai } from '../lib/ai';
import { Spinner } from './ui';

/** Concise "why" — shown only when the user asks for it. */
export const AIExplanation = ({ name, reasons, concerns, unknowns, heading }: { name: string; reasons: string[]; concerns: string[]; unknowns: string[]; heading?: string }) => {
  const [data, setData] = useState<{ why: string[]; lessSure: string[]; cannotKnow: string[] } | null>(null);
  useEffect(() => {
    let live = true;
    ai.explainMatch({ name, reasons, concerns, unknowns }).then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [name, reasons, concerns, unknowns]);
  if (!data) return <Spinner label="Putting my reasoning into words…" />;
  return (
    <div className="space-y-5">
      <div>
        <h4 className="mb-2 font-semibold text-heading">{heading ?? `Why I suggested ${name}`}</h4>
        <ul className="space-y-1.5">
          {data.why.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              {r}
            </li>
          ))}
        </ul>
      </div>
      {data.lessSure.length > 0 && (
        <div>
          <h4 className="mb-2 font-semibold text-heading">Something I’m less sure about</h4>
          <ul className="space-y-1.5 text-ink">
            {data.lessSure.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full border border-muted" aria-hidden />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.cannotKnow.length > 0 && (
        <div>
          <h4 className="mb-2 font-semibold text-heading">What I can’t know yet</h4>
          <ul className="space-y-1.5 text-muted">
            {data.cannotKnow.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/** Free-form question box answered by the AI layer. */
export const AskPairwise = ({ context, suggestions }: { context: Parameters<typeof ai.ask>[1]; suggestions: string[] }) => {
  const [q, setQ] = useState('');
  const [thread, setThread] = useState<{ q: string; a: string | null }[]>([]);
  const ask = async (question: string) => {
    if (!question.trim()) return;
    setQ('');
    setThread((t) => [...t, { q: question, a: null }]);
    const a = await ai.ask(question, context);
    setThread((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, a } : x)));
  };
  return (
    <div className="space-y-4">
      {thread.map((t, i) => (
        <div key={i} className="space-y-2">
          <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-soft px-4 py-2.5 text-[15px] text-heading">{t.q}</p>
          {t.a == null ? (
            <Spinner label="Thinking…" />
          ) : (
            <p className="flex max-w-[90%] gap-2 text-[15px] text-ink">
              <Sparkles className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden />
              {t.a}
            </p>
          )}
        </div>
      ))}
      {thread.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => ask(s)} className="min-h-10 rounded-full border border-line bg-surface px-4 text-sm font-medium text-heading hover:bg-soft">
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <label htmlFor={`ask-${context.name}`} className="sr-only">
          Ask Pairwise
        </label>
        <input id={`ask-${context.name}`} className="input" placeholder="Ask Pairwise anything about this" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" aria-label="Send question" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent hover:bg-accent-strong">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

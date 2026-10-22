"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Mic, Search, Sparkles, X } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { RetailerMark } from "@/components/orbit/retail";
import { ButtonLink, ExternalButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { ASK_EXAMPLES, ask } from "@/lib/intelligence/ask";
import { retailerOf } from "@/lib/store/selectors";
import { useOrbit } from "@/lib/store/store";

type Recognition = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function AskPage() {
  const params = useSearchParams();
  const o = useOrbit();
  const [q, setQ] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const startVoice = () => {
    const r = getRecognition();
    if (!r) {
      setVoiceNote("Voice isn't available in this browser. Type your question instead.");
      input.current?.focus();
      return;
    }
    rec.current = r;
    r.lang = "en-US";
    r.interimResults = true;
    r.onresult = (e) => setQ(Array.from(e.results, (x) => x[0].transcript).join(" "));
    r.onend = () => setListening(false);
    r.onerror = () => {
      setListening(false);
      setVoiceNote("We couldn't hear that. Check microphone access, or type instead.");
    };
    setVoiceNote(null);
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
      setVoiceNote("Voice isn't available here. Type your question instead.");
    }
  };

  useEffect(() => {
    if (params.get("voice") === "1") startVoice();
    else input.current?.focus();
    return () => rec.current?.stop();
    // Run once on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!o) return <Shell loading nav={false} />;
  const { results } = q.trim().length >= 3 ? ask(q, o.data, o.today) : { results: [] };
  const searched = q.trim().length >= 3;

  return (
    <Shell nav={false}>
      <BackBar fallback="/" title="Ask Penny" />

      <div className="pt-2">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">What are you looking for?</h1>
        <p className="mt-1 text-[16px] text-muted">Describe it however you remember it. No order number needed.</p>
      </div>

      <form
        className="mt-5 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          input.current?.blur();
        }}
      >
        <label htmlFor="ask" className="sr-only">
          Ask Penny
        </label>
        <div className="flex h-[52px] min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-card px-4 shadow-[var(--shadow-card)] focus-within:border-navy/40">
          <Search aria-hidden className="size-5 shrink-0 text-muted" />
          <input
            id="ask"
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="“black dress, ordered last month”"
            autoComplete="off"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted/70"
          />
          {q && (
            <button type="button" aria-label="Clear" onClick={() => setQ("")} className="-mr-2 flex size-9 items-center justify-center rounded-full text-muted hover:bg-ivory-deep">
              <X aria-hidden className="size-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => (listening ? rec.current?.stop() : startVoice())}
          aria-label={listening ? "Stop listening" : "Ask by voice"}
          aria-pressed={listening}
          className={cn(
            "flex size-[52px] shrink-0 items-center justify-center rounded-full text-white shadow-[var(--shadow-card)] transition-colors",
            listening ? "animate-pulse bg-terracotta" : "bg-navy hover:bg-navy-soft",
          )}
        >
          <Mic aria-hidden className="size-5" />
        </button>
      </form>
      {listening && <p role="status" className="mt-2 px-2 text-[14px] font-medium text-terracotta">Listening…</p>}
      {voiceNote && <p role="status" className="mt-2 px-2 text-[14px] text-muted">{voiceNote}</p>}

      {!searched && (
        <div className="mt-6">
          <p className="mb-2 text-[14px] font-semibold text-muted">Try asking</p>
          <div className="flex flex-wrap gap-2">
            {ASK_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setQ(ex)}
                className="min-h-11 rounded-full border border-line bg-card px-4 py-2 text-left text-[15px] hover:bg-ivory-deep"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {searched && (
        <section aria-live="polite" className="mt-6 space-y-3">
          {results.length === 0 ? (
            <Card className="p-5 text-center">
              <Sparkles aria-hidden className="mx-auto size-6 text-muted" />
              <p className="mt-2 font-semibold">Nothing matched yet</p>
              <p className="mt-1 text-[15px] text-muted">Try the store, what it was (dress, jeans, sneakers), a color, or roughly when you ordered it.</p>
            </Card>
          ) : (
            results.map((r, i) => {
              const retailer = retailerOf(o.data, r.retailerId);
              return (
                <Card key={r.id} as="article" className={cn("p-4", i === 0 && "shadow-[var(--shadow-lift)]")}>
                  <Link href={r.href} className="-m-1 flex items-center gap-2.5 rounded-xl p-1 hover:bg-ivory-deep">
                    {r.retailerId ? <RetailerMark retailer={retailer} /> : <span className="flex size-8 items-center justify-center rounded-[10px] bg-ivory-deep"><Sparkles aria-hidden className="size-4" /></span>}
                    <p className="min-w-0 flex-1 truncate text-[16px] font-semibold">{r.title}</p>
                    {i === 0 && results.length > 1 && <span className="text-[13px] font-semibold text-muted">Best match</span>}
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
                  </Link>
                  <p className="mt-2 text-[16px] leading-snug">{r.answer}</p>
                  {r.note && <p className="mt-1 text-[14px] text-sand-ink">{r.note}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.actions.filter((a) => a.href !== r.href || r.actions.length === 1).map((a, j) =>
                      a.href.startsWith("http") ? (
                        <ExternalButton key={a.href} href={a.href} variant="secondary" size="sm">
                          {a.label}
                        </ExternalButton>
                      ) : (
                        <ButtonLink key={a.href} href={a.href} variant={j === 0 ? "primary" : "secondary"} size="sm">
                          {a.label}
                        </ButtonLink>
                      ),
                    )}
                  </div>
                </Card>
              );
            })
          )}
          <p className="px-1 text-[13px] text-muted">Answers come only from your own orders and emails.</p>
        </section>
      )}
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Shell loading nav={false} />}>
      <AskPage />
    </Suspense>
  );
}

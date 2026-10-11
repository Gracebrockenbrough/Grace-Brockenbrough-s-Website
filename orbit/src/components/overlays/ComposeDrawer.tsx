"use client";

import { useState } from "react";
import { Copy, ExternalLink, Mail, MessageCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { COMPOSE_IDEAS, composeDraft, toneDraft, TONES, type Tone } from "@/lib/drafts";
import { gmailCompose, smsLink } from "@/lib/handoff";
import { useUI } from "@/store/UIProvider";
import { Drawer } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";

/** "Help me write…" for texts and emails. Orbit drafts it; you send it from your own app. */
export function ComposeDrawer({ onClose, kind: initialKind = "text", to: initialTo = "", about: initialAbout = "" }: { onClose: () => void; kind?: "text" | "email"; to?: string; about?: string }) {
  const { notify } = useUI();
  const [kind, setKind] = useState<"text" | "email">(initialKind);
  const [to, setTo] = useState(initialTo);
  const [about, setAbout] = useState(initialAbout);
  const [tone, setTone] = useState<Tone>("Friendly");
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(initialAbout ? composeDraft({ kind: initialKind, to: initialTo, about: initialAbout }) : null);

  const write = (k = kind, t = to, a = about) => {
    setTone("Friendly");
    setDraft(composeDraft({ kind: k, to: t, about: a }));
  };

  const copy = () => {
    if (!draft) return;
    navigator.clipboard?.writeText(draft.body).catch(() => undefined);
    notify("Copied. Paste it wherever you're sending it.");
  };

  return (
    <Drawer
      title="Help me write"
      onClose={onClose}
      footer={
        draft ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={copy}>
              <Copy size={16} aria-hidden /> Copy
            </Button>
            <a
              href={kind === "email" ? gmailCompose({ subject: draft.subject, body: draft.body }) : smsLink(draft.body)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => navigator.clipboard?.writeText(draft.body).catch(() => undefined)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line-strong px-4 text-[15px] font-medium hover:bg-sunken"
            >
              <ExternalLink size={16} aria-hidden /> {kind === "email" ? "Open in Gmail" : "Open in Messages"}
            </a>
          </div>
        ) : (
          <Button variant="primary" disabled={!about.trim()} onClick={() => write()}>
            <Sparkles size={16} aria-hidden /> Write it
          </Button>
        )
      }
    >
      <p className="text-[14.5px] text-ink-2">Orbit writes a draft. You check it, then send it yourself. Orbit never sends anything for you.</p>

      <div role="group" aria-label="Message type" className="mt-4 grid grid-cols-2 gap-2">
        {(["text", "email"] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => {
              setKind(k);
              if (draft) write(k);
            }}
            className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl border text-[15px] font-medium", kind === k ? "border-accent bg-accent-soft text-accent-strong" : "border-line-strong text-ink-2")}
          >
            {k === "text" ? <MessageCircle size={17} aria-hidden /> : <Mail size={17} aria-hidden />}
            {k === "text" ? "Text" : "Email"}
          </button>
        ))}
      </div>

      <label className="mt-4 block text-[14px] text-ink-3">
        To
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Mom, Professor Hale, Sarah…" className="mt-1 block min-h-11 w-full rounded-xl border border-line-strong bg-canvas px-3 text-[15.5px] text-ink" />
      </label>
      <label className="mt-3 block text-[14px] text-ink-3">
        What do you want to say?
        <textarea
          data-autofocus
          rows={2}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="Ask for an extension on the problem set"
          className="mt-1 block w-full resize-none rounded-xl border border-line-strong bg-canvas p-3 text-[15.5px] text-ink"
        />
      </label>

      {!draft && (
        <>
          <p className="mb-2 mt-5 text-[13.5px] font-semibold text-ink-3">Start from</p>
          <div className="flex flex-wrap gap-2">
            {COMPOSE_IDEAS.map((i) => (
              <button
                key={i.label}
                type="button"
                onClick={() => {
                  setKind(i.kind);
                  setTo(i.to);
                  setAbout(i.about);
                  write(i.kind, i.to, i.about);
                }}
                className="min-h-9 rounded-full border border-line-strong px-3.5 text-[14px] text-ink-2 hover:border-accent hover:text-ink"
              >
                {i.label}
              </button>
            ))}
          </div>
        </>
      )}

      {draft && (
        <div className="mt-5 animate-rise-in">
          <div role="group" aria-label="Tone" className="flex flex-wrap gap-1.5">
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tone === t}
                onClick={() => {
                  setTone(t);
                  const base = composeDraft({ kind, to, about });
                  setDraft({ ...base, body: toneDraft(base.body, t) });
                }}
                className={cn("min-h-8 rounded-full border px-3 text-[14px]", tone === t ? "border-accent bg-accent-soft font-medium text-accent-strong" : "border-line-strong text-ink-2 hover:text-ink")}
              >
                {t}
              </button>
            ))}
          </div>
          {kind === "email" && (
            <label className="mt-3 block text-[14px] text-ink-3">
              Subject
              <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className="mt-1 block min-h-10 w-full rounded-xl border border-line-strong bg-canvas px-3 text-[15px] text-ink" />
            </label>
          )}
          <label htmlFor="compose-body" className="sr-only">Draft</label>
          <textarea
            id="compose-body"
            rows={kind === "email" ? 9 : 4}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            className={cn("mt-3 w-full rounded-2xl border border-line-strong p-3 text-[15px] leading-relaxed", kind === "text" ? "bg-accent-soft" : "bg-canvas")}
          />
          <button type="button" onClick={() => setDraft(null)} className="mt-1 text-[14px] text-ink-3 hover:text-ink">Start over</button>
        </div>
      )}
    </Drawer>
  );
}

"use client";

import { useState } from "react";
import { Copy, ExternalLink, Info } from "lucide-react";
import { formatLongDate, formatTime, datePart, timePart, formatTimeRange, formatShortDate } from "@/lib/time";
import { uid } from "@/lib/cn";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { useMessageActions } from "@/store/useActions";
import { Drawer } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";
import { Menu } from "@/components/ui/Menu";
import { Pill } from "@/components/ui/Badges";
import { MESSAGE_CLASS_LABEL, SENDER_LABEL, classifyMessage, replyWhy } from "@/services/messages";
import { mockReplyDrafts } from "@/data/mockReplyDrafts";
import { SOURCE_KIND_LABEL } from "@/data/mockSources";
import { TONES, toneDraft, type Tone } from "@/lib/drafts";
import { gmailCompose, smsLink, APP_LINKS } from "@/lib/handoff";

/** Needs Reply details. ORBIT drafts, the user decides — nothing is sent automatically. */
export function MessageDrawer({ id, onClose, startDraft = false }: { id: string; onClose: () => void; startDraft?: boolean }) {
  const { state, derived, dispatch } = useOrbit();
  const { notify } = useUI();
  const feedback = useMessageActions();
  const message = state.messages.find((m) => m.id === id);
  const draftData = message ? mockReplyDrafts[message.id] : undefined;
  const [showDraft, setShowDraft] = useState(startDraft);
  const [tone, setTone] = useState<Tone>("Friendly");
  const [draft, setDraft] = useState(draftData?.draft ?? "");
  const [addFollowUp, setAddFollowUp] = useState(true);

  if (!message) {
    return (
      <Drawer title="Message not found" onClose={onClose}>
        <p className="text-ink-2">It may have been removed.</p>
      </Drawer>
    );
  }

  const c = classifyMessage(message, state.preferences);
  const needsReply = c.category === "requires_reply" && !message.responded;
  const followUp = draftData?.followUp;

  const markReplied = () => {
    dispatch({ type: "MESSAGE_FEEDBACK", id: message.id, feedback: "replied" });
    if (followUp && addFollowUp) {
      dispatch({
        type: "ADD_EVENT",
        event: {
          id: uid("ev"),
          title: followUp.title,
          date: followUp.date,
          startTime: followUp.startTime,
          endTime: followUp.endTime,
          location: followUp.location,
          category: "meeting",
          source: { kind: "email", label: `${message.sender} email`, ref: message.id },
          hardCommitment: true,
          confidence: 1,
        },
      });
      notify(`Marked replied and added “${followUp.title}” to ${formatShortDate(followUp.date)}.`, { undoable: true });
    } else {
      notify("Marked as replied.", { undoable: true });
    }
    onClose();
  };

  return (
    <Drawer
      title={message.subject ?? `Message from ${message.sender}`}
      onClose={onClose}
      eyebrow={
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={c.category === "requires_reply" ? "accent" : c.category === "action_required" || c.category === "important_information" ? "attention" : "neutral"}>
            {message.responded ? "Replied" : MESSAGE_CLASS_LABEL[c.category]}
          </Pill>
          <span className="text-[13px] text-ink-3">{c.importance === "high" ? "High importance" : c.importance === "medium" ? "Medium importance" : "Low importance"}</span>
        </div>
      }
      footer={
        <div className="flex flex-wrap items-center gap-2">
          {needsReply ? (
            <>
              <Button variant="primary" onClick={() => setShowDraft(true)} disabled={showDraft}>
                {draftData ? "Draft a reply" : "Reply"}
              </Button>
              <Button variant="secondary" onClick={() => { feedback(message.id, "remind_later"); onClose(); }}>
                Remind me later
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={onClose}>Close</Button>
          )}
          <div className="ml-auto">
            <Menu
              label="Teach ORBIT"
              items={[
                { section: "Teach ORBIT", label: "This is important", onSelect: () => feedback(message.id, "important") },
                { label: "Not important", onSelect: () => { feedback(message.id, "not_important"); onClose(); } },
                { label: `Always ignore ${message.sender}`, tone: "danger", onSelect: () => { feedback(message.id, "ignore_source"); onClose(); } },
              ]}
            />
          </div>
        </div>
      }
    >
      <div className="mb-4">
        <p className="text-[16px] font-semibold">{message.sender}</p>
        <p className="text-[14px] text-ink-3">
          {message.senderDetail ?? SENDER_LABEL[message.senderType]} · {SOURCE_KIND_LABEL[message.source]} · {formatLongDate(datePart(message.timestamp))}, {formatTime(timePart(message.timestamp))}
        </p>
      </div>

      <div className="whitespace-pre-line rounded-2xl border border-line bg-canvas p-4 text-[15px] leading-relaxed text-ink">{message.content}</div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-accent-soft px-3 py-2.5 text-[14.5px]">
        <Info size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
        <p>
          <span className="font-medium">Why ORBIT {needsReply ? "surfaced this" : "classified it this way"}: </span>
          {needsReply ? replyWhy(message, derived.now) : c.reason}
        </p>
      </div>

      {showDraft && needsReply && (
        <div className="mt-5 animate-rise-in">
          <p className="text-[14px] text-ink-2">ORBIT writes it; you check it and send it yourself from {message.channel}.</p>
          <div role="group" aria-label="Tone" className="mt-3 flex flex-wrap gap-1.5">
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tone === t}
                onClick={() => {
                  setTone(t);
                  setDraft(toneDraft(draftData?.draft ?? "", t));
                }}
                className={`min-h-8 rounded-full border px-3 text-[14px] ${tone === t ? "border-accent bg-accent-soft font-medium text-accent-strong" : "border-line-strong text-ink-2 hover:text-ink"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <label htmlFor="draft" className="sr-only">Your message</label>
          <textarea
            id="draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            data-autofocus
            className="mt-2 w-full rounded-2xl border border-line-strong p-3 text-[15px] leading-relaxed"
          />
          {followUp && (
            <label className="mt-3 flex items-start gap-3 rounded-xl border border-line p-3 text-[14.5px]">
              <input type="checkbox" checked={addFollowUp} onChange={(e) => setAddFollowUp(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
              <span>
                Also add <span className="font-medium">{followUp.title}</span> to my calendar
                <span className="block text-[13.5px] text-ink-3">
                  {formatShortDate(followUp.date)} · {formatTimeRange(followUp.startTime, followUp.endTime)} — {followUp.note}
                </span>
              </span>
            </label>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                navigator.clipboard?.writeText(draft).catch(() => undefined);
                notify("Draft copied. ORBIT never sends messages for you.");
              }}
            >
              <Copy size={15} aria-hidden /> Copy draft
            </Button>
            {(() => {
              const handoff =
                message.source === "email"
                  ? { label: "Open in Gmail", href: gmailCompose({ subject: `Re: ${message.subject ?? ""}`, body: draft }) }
                  : message.source === "text"
                    ? { label: "Open in Messages", href: smsLink(draft) }
                    : message.source === "groupme"
                      ? { label: "Open GroupMe", href: APP_LINKS.groupme.href }
                      : undefined;
              return handoff ? (
                <a
                  href={handoff.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => navigator.clipboard?.writeText(draft).catch(() => undefined)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3 text-sm font-medium hover:bg-sunken"
                >
                  <ExternalLink size={15} aria-hidden /> {handoff.label}
                </a>
              ) : null;
            })()}
            <Button size="sm" variant="primary" onClick={markReplied}>
              I sent it — mark replied
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}

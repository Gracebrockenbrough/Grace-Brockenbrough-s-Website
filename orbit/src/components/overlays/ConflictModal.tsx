"use client";

import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import type { CalendarItem } from "@/types";
import { cn } from "@/lib/cn";
import { addMinutesToTime, formatTime, formatTimeRange, relativeDay, toMinutes } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Modal } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";

interface Option {
  id: string;
  label: string;
  detail: string;
  apply: () => void;
}

function OverlapBars({ a, b }: { a: CalendarItem; b: CalendarItem }) {
  const start = Math.min(toMinutes(a.startTime!), toMinutes(b.startTime!)) - 15;
  const end = Math.max(toMinutes(a.endTime!), toMinutes(b.endTime!)) + 15;
  const span = end - start;
  const pos = (t: string) => `${((toMinutes(t) - start) / span) * 100}%`;
  const width = (s: string, e: string) => `${((toMinutes(e) - toMinutes(s)) / span) * 100}%`;
  const oStart = a.startTime! > b.startTime! ? a.startTime! : b.startTime!;
  const oEnd = a.endTime! < b.endTime! ? a.endTime! : b.endTime!;
  return (
    <div className="mt-4 rounded-2xl border border-line bg-canvas px-4 pb-3 pt-4" aria-hidden>
      <div className="relative">
        <div className="absolute -bottom-1 -top-1 rounded-lg bg-attention-soft ring-1 ring-attention-line" style={{ left: pos(oStart), width: width(oStart, oEnd) }} />
        {[a, b].map((x) => (
          <div key={x.id} className="relative mb-2 h-9 last:mb-0">
            <div
              className={cn("absolute inset-y-0 flex items-center truncate rounded-lg px-2 text-[13px] font-medium", x.hardCommitment ? "bg-ink text-white" : "bg-accent-soft text-accent-strong ring-1 ring-accent-line")}
              style={{ left: pos(x.startTime!), width: width(x.startTime!, x.endTime!) }}
            >
              {x.title}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[12.5px] text-ink-3">
        <span>{formatTime(addMinutesToTime("00:00", start))}</span>
        <span>{formatTime(addMinutesToTime("00:00", end))}</span>
      </div>
    </div>
  );
}

/** Review options for an overlap. Real appointments never move without approval. */
export function ConflictModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { derived, dispatch } = useOrbit();
  const { notify } = useUI();
  const [selected, setSelected] = useState<string | null>(null);
  const conflict = derived.conflicts.find((c) => c.id === id);

  if (!conflict || !conflict.items || conflict.items.length < 2) {
    return (
      <Modal title="Already resolved" onClose={onClose}>
        <p className="text-ink-2">This conflict is no longer on your calendar.</p>
      </Modal>
    );
  }

  const [a, b] = conflict.items;
  const flexible = [a, b].find((x) => !x.hardCommitment && x.kind === "event");
  const fixed = flexible ? (flexible === a ? b : a) : undefined;
  const resolveWith = (message: string, payload: Parameters<typeof dispatch>[0]) => {
    dispatch(payload);
    notify(message, { undoable: true });
    onClose();
  };

  const options: Option[] = [];
  if (flexible && fixed) {
    if (flexible.startTime! < fixed.startTime!) {
      const leaveAt = addMinutesToTime(fixed.startTime!, -5);
      options.push({
        id: "leave-early",
        label: `Leave ${flexible.title.toLowerCase()} at ${formatTime(leaveAt)}`,
        detail: `You'd get ${toMinutes(leaveAt) - toMinutes(flexible.startTime!)} minutes of it and make your ${fixed.title.toLowerCase()} on time.`,
        apply: () =>
          resolveWith(`${flexible.title} now ends at ${formatTime(leaveAt)}.`, {
            type: "RESOLVE_CONFLICT",
            conflictId: conflict.id,
            eventPatches: [{ id: flexible.refId, patch: { endTime: leaveAt } }],
          }),
      });
    } else if (fixed.endTime! < flexible.endTime!) {
      options.push({
        id: "join-late",
        label: `Join ${flexible.title.toLowerCase()} at ${formatTime(fixed.endTime)}`,
        detail: `Go to your ${fixed.title.toLowerCase()} first, then catch the rest.`,
        apply: () =>
          resolveWith(`${flexible.title} now starts at ${formatTime(fixed.endTime)}.`, {
            type: "RESOLVE_CONFLICT",
            conflictId: conflict.id,
            eventPatches: [{ id: flexible.refId, patch: { startTime: fixed.endTime } }],
          }),
      });
    }
    options.push({
      id: "skip",
      label: `Skip ${flexible.title.toLowerCase()}`,
      detail: flexible.courseId ? "Review sessions are optional. Slides are usually posted on Canvas." : "It's flexible, so it can come off your calendar.",
      apply: () =>
        resolveWith(`Removed ${flexible.title.toLowerCase()} from your calendar.`, {
          type: "RESOLVE_CONFLICT",
          conflictId: conflict.id,
          removeEventIds: [flexible.refId],
        }),
    });
  }
  const askTarget = fixed ?? b;
  options.push({
    id: "ask",
    label: `Ask to reschedule ${askTarget.title.toLowerCase()}`,
    detail: "ORBIT drafts a short note for you to send. Nothing is sent automatically, and both events stay until you confirm a new time.",
    apply: () => {
      navigator.clipboard?.writeText(`Hi, I have a conflict on ${relativeDay(askTarget.date, derived.today)} at ${formatTime(askTarget.startTime)}. Would another time work for my ${askTarget.title.toLowerCase()}? Thank you, Grace`).catch(() => undefined);
      resolveWith("Draft copied. Both events stay on your calendar until a new time is confirmed.", { type: "RESOLVE_CONFLICT", conflictId: conflict.id });
    },
  });

  const chosen = options.find((o) => o.id === selected);

  return (
    <Modal
      title="Schedule conflict"
      onClose={onClose}
      eyebrow={<span className="text-[13px] font-semibold uppercase tracking-wide text-attention">{relativeDay(conflict.date!, derived.today)}</span>}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={!chosen} onClick={() => chosen?.apply()}>
            {chosen ? "Confirm" : "Choose an option"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => resolveWith("Kept both. ORBIT won't flag this overlap again.", { type: "DISMISS_CONFLICT", conflictId: conflict.id })}
          >
            Keep both
          </Button>
        </div>
      }
    >
      <p className="text-[16px]">
        These events overlap by <span className="font-semibold">{conflict.overlapMinutes} minutes</span>.
      </p>
      <ul className="mt-3 space-y-1 text-[15px]">
        {[a, b].map((x) => (
          <li key={x.id} className="flex justify-between gap-4">
            <span className="font-medium">{x.title}</span>
            <span className="text-ink-2">
              {formatTimeRange(x.startTime, x.endTime)}
              <span className="ml-2 text-[13px] text-ink-3">{x.hardCommitment ? "Fixed" : "Flexible"}</span>
            </span>
          </li>
        ))}
      </ul>
      <OverlapBars a={a} b={b} />

      <fieldset className="mt-6">
        <legend className="mb-2 text-[15px] font-semibold">Options</legend>
        <div className="space-y-2">
          {options.map((o) => (
            <label
              key={o.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-colors",
                selected === o.id ? "border-accent bg-accent-soft/60" : "border-line hover:bg-canvas",
              )}
            >
              <input type="radio" name="conflict-option" value={o.id} checked={selected === o.id} onChange={() => setSelected(o.id)} className="sr-only" />
              <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", selected === o.id ? "border-accent bg-accent text-white" : "border-line-strong")} aria-hidden>
                {selected === o.id && <Check size={12} strokeWidth={3} />}
              </span>
              <span>
                <span className="block text-[15px] font-medium">{o.label}</span>
                <span className="block text-[14px] text-ink-2">{o.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-4 flex items-start gap-2 text-[14px] text-ink-2">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-success" aria-hidden />
        ORBIT only changes flexible plans, and only after you confirm.
      </p>
    </Modal>
  );
}

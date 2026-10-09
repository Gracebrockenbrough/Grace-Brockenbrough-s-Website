"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { addMinutesToTime, formatTime, formatTimeRange, relativeDay, toMinutes } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Modal } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";
import { EVENT_META } from "@/components/calendar/eventStyle";

interface Option {
  id: string;
  label: string;
  detail: string;
  apply: () => void;
}

/**
 * ORBIT recommends one plan instead of presenting equal choices.
 * Real appointments never move; only flexible plans change, and only on confirm.
 */
export function ConflictModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { derived, dispatch } = useOrbit();
  const { notify } = useUI();
  const [showOthers, setShowOthers] = useState(false);
  const conflict = derived.conflicts.find((c) => c.id === id);

  if (!conflict || !conflict.items || conflict.items.length < 2) {
    return (
      <Modal title="Already fixed" onClose={onClose}>
        <p className="text-ink-2">This conflict is no longer on your calendar.</p>
      </Modal>
    );
  }

  const [a, b] = conflict.items;
  const flexible = [a, b].find((x) => !x.hardCommitment && x.kind === "event");
  const fixed = flexible ? (flexible === a ? b : a) : undefined;
  const short = (t: string) => t.replace(/\s+(session|appointment)$/i, "");
  const resolve = (message: string, payload: Parameters<typeof dispatch>[0]) => {
    dispatch(payload);
    notify(message, { undoable: true });
    onClose();
  };

  const options: Option[] = [];
  if (flexible && fixed) {
    if (flexible.startTime! < fixed.startTime!) {
      const leaveAt = addMinutesToTime(fixed.startTime!, -5);
      const kept = toMinutes(leaveAt) - toMinutes(flexible.startTime!);
      options.push({
        id: "leave-early",
        label: `Leave ${short(flexible.title)} at ${formatTime(leaveAt)}`,
        detail: `You'll still get ${kept} minutes of it and make ${short(fixed.title).toLowerCase()} on time.`,
        apply: () => resolve(`${short(flexible.title)} now ends at ${formatTime(leaveAt)}.`, { type: "RESOLVE_CONFLICT", conflictId: conflict.id, eventPatches: [{ id: flexible.refId, patch: { endTime: leaveAt } }] }),
      });
    } else if (fixed.endTime! < flexible.endTime!) {
      options.push({
        id: "join-late",
        label: `Join ${short(flexible.title)} at ${formatTime(fixed.endTime)}`,
        detail: `Go to ${short(fixed.title).toLowerCase()} first, then catch the rest.`,
        apply: () => resolve(`${short(flexible.title)} now starts at ${formatTime(fixed.endTime)}.`, { type: "RESOLVE_CONFLICT", conflictId: conflict.id, eventPatches: [{ id: flexible.refId, patch: { startTime: fixed.endTime } }] }),
      });
    }
    options.push({
      id: "skip",
      label: `Skip ${short(flexible.title)}`,
      detail: flexible.courseId ? "Review sessions are optional. Slides are usually posted." : "It's flexible, so it can come off your calendar.",
      apply: () => resolve(`Removed ${short(flexible.title).toLowerCase()} from your calendar.`, { type: "RESOLVE_CONFLICT", conflictId: conflict.id, removeEventIds: [flexible.refId] }),
    });
  }
  const askTarget = fixed ?? b;
  options.push({
    id: "ask",
    label: `Reschedule ${short(askTarget.title).toLowerCase()}`,
    detail: "Ask for a new time yourself. ORBIT copies a short note you can send; nothing is sent for you.",
    apply: () => {
      navigator.clipboard?.writeText(`Hi, I have a conflict on ${relativeDay(askTarget.date, derived.today)} at ${formatTime(askTarget.startTime)}. Would another time work? Thank you, Grace`).catch(() => undefined);
      resolve("Note copied. Both events stay until a new time is confirmed.", { type: "RESOLVE_CONFLICT", conflictId: conflict.id });
    },
  });
  options.push({
    id: "keep",
    label: "Keep both",
    detail: "ORBIT won't flag this overlap again.",
    apply: () => resolve("Kept both.", { type: "DISMISS_CONFLICT", conflictId: conflict.id }),
  });

  const [recommended, ...others] = options;

  return (
    <Modal title={`Conflict ${relativeDay(conflict.date!, derived.today)}`} onClose={onClose}>
      <ul className="space-y-2">
        {[a, b].map((x) => (
          <li key={x.id} className="flex items-center gap-3">
            <span className={cn("h-9 w-1 rounded-full", EVENT_META[x.category].dot)} aria-hidden />
            <span className="flex-1 text-[16px] font-medium">{short(x.title)}</span>
            <span className="text-[15px] tabular-nums text-ink-2">{formatTimeRange(x.startTime, x.endTime)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-2xl border border-accent-line bg-accent-soft/50 p-4">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-accent-strong">
          <Sparkles size={14} aria-hidden /> Recommended
        </p>
        <p className="mt-1.5 text-[17px] font-semibold">{recommended.label}.</p>
        <p className="mt-0.5 text-[15px] text-ink-2">{recommended.detail}</p>
        <Button variant="primary" className="mt-4" onClick={recommended.apply} data-autofocus>
          Use this plan
        </Button>
      </div>

      <button
        type="button"
        aria-expanded={showOthers}
        onClick={() => setShowOthers((v) => !v)}
        className="mt-4 inline-flex min-h-10 items-center gap-1 text-[15px] font-medium text-ink-2 hover:text-ink"
      >
        Other options <ChevronDown size={16} className={cn("transition-transform", !showOthers && "-rotate-90")} aria-hidden />
      </button>
      {showOthers && (
        <ul className="mt-1 divide-y divide-line rounded-2xl border border-line">
          {others.map((o) => (
            <li key={o.id}>
              <button type="button" onClick={o.apply} className="w-full px-4 py-3 text-left hover:bg-canvas">
                <span className="block text-[15px] font-medium">{o.label}</span>
                <span className="block text-[14px] text-ink-3">{o.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

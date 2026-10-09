"use client";

import { ArrowDown, ArrowRight, ShieldCheck } from "lucide-react";
import { relativePast } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Modal } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";
import { ConfidenceTag, SourceBadge } from "@/components/ui/Badges";
import { describeWhen } from "@/services/changes";

/** High-impact schedule changes are never applied silently. */
export function ChangeModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, derived, dispatch } = useOrbit();
  const { open, notify } = useUI();
  const change = derived.changes.find((c) => c.id === id);

  if (!change) {
    return (
      <Modal title="Already handled" onClose={onClose}>
        <p className="text-ink-2">This change has already been applied or dismissed.</p>
      </Modal>
    );
  }

  const confident = change.confidence >= 0.8;
  const course = state.courses.find((c) => c.id === change.courseId);
  const message = change.source.ref ? state.messages.find((m) => m.id === change.source.ref) : undefined;

  const apply = () => {
    dispatch({ type: "APPLY_CHANGE", changeId: change.id, entityType: change.entityType, entityId: change.entityId, value: change.newValue });
    notify(`${change.title} updated to ${describeWhen(change.newValue)}.`, { undoable: true });
    onClose();
  };
  const ignore = () => {
    dispatch({ type: "DISMISS_CHANGE", changeId: change.id });
    notify(confident ? "Kept the original date." : "Kept the original date. ORBIT will watch for an official update.", { undoable: true });
    onClose();
  };

  return (
    <Modal
      title={confident ? "Important change detected" : "Possible change"}
      onClose={onClose}
      eyebrow={<span className="text-[13px] font-semibold uppercase tracking-wide text-attention">{course?.code ?? "Change"}</span>}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={apply} data-autofocus>
            {confident ? "Update calendar" : "Update anyway"}
          </Button>
          {message && (
            <Button variant="secondary" onClick={() => open({ type: "message", id: message.id })}>
              Review source
            </Button>
          )}
          <Button variant="ghost" onClick={ignore}>
            {confident ? "Ignore" : "Keep original"}
          </Button>
        </div>
      }
    >
      <p className="text-[16px] text-ink">
        <span className="font-semibold">{change.title}</span> {confident ? "appears to have moved." : "may have moved, but it isn't confirmed."}
      </p>

      <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="flex-1 rounded-2xl border border-line bg-canvas p-4">
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-ink-3">On your calendar</p>
          <p className="mt-1 text-[16px] text-ink-2 line-through decoration-ink-3/60">{describeWhen(change.previousValue)}</p>
        </div>
        <ArrowRight className="hidden shrink-0 text-ink-3 sm:block" size={20} aria-hidden />
        <ArrowDown className="mx-auto shrink-0 text-ink-3 sm:hidden" size={20} aria-hidden />
        <div className="flex-1 rounded-2xl border border-attention-line bg-attention-soft p-4">
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-attention">New information</p>
          <p className="mt-1 text-[16px] font-semibold text-ink">{describeWhen(change.newValue)}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={change.source} className="text-[14px] text-ink-2" />
          {message && <span className="text-[13.5px] text-ink-3">· {relativePast(message.timestamp, derived.now)}</span>}
          <ConfidenceTag confidence={change.confidence} />
        </div>
        <blockquote className="mt-2 border-l-2 border-line-strong pl-3 text-[15px] italic leading-relaxed text-ink-2">“{change.quote}”</blockquote>
      </div>

      <p className="mt-5 flex items-start gap-2 text-[14px] text-ink-2">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-success" aria-hidden />
        {confident
          ? "ORBIT hasn't changed your calendar yet. Updating moves the exam and rechecks your week for conflicts."
          : "Only a classmate mentioned this. ORBIT won't change anything unless you say so."}
      </p>
    </Modal>
  );
}

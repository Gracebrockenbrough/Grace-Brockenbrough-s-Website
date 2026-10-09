"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, Pencil } from "lucide-react";
import type { LoopStatus, PriorityLevel } from "@/types";
import { datePart, formatLongDate, formatTime, relativeDateTime, timePart } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { SNOOZE_OPTIONS, useLoopActions } from "@/store/useActions";
import { Drawer, DetailRow } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";
import { ConfidenceTag, PriorityTag, SourceBadge } from "@/components/ui/Badges";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Menu } from "@/components/ui/Menu";
import { findLoop } from "./lookup";

const CATEGORY_LABEL = { school: "School", work: "Work", personal: "Personal" };
const CONSEQUENCE_LABEL = { academic: "Grade", professional: "Career", financial: "Money", travel: "Travel", social: "Social", low: "Low stakes" };

export function LoopDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, derived, dispatch } = useOrbit();
  const { open, notify } = useUI();
  const actions = useLoopActions();
  const loop = findLoop(id, state, derived);
  const [rescheduling, setRescheduling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(loop?.title ?? "");
  const [date, setDate] = useState(loop?.deadline ? datePart(loop.deadline) : derived.today);
  const [time, setTime] = useState(loop?.deadline ? (timePart(loop.deadline) ?? "17:00") : "17:00");

  if (!loop) {
    return (
      <Drawer title="This item is gone" onClose={onClose}>
        <p className="text-ink-2">It may have been completed or removed.</p>
      </Drawer>
    );
  }

  const course = state.courses.find((c) => c.id === loop.courseId);
  const editable = loop.derivedFrom === "loop";
  const done = loop.status === "done";

  return (
    <Drawer
      title={loop.title}
      onClose={onClose}
      eyebrow={<PriorityTag level={loop.priority} />}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={done ? "secondary" : "primary"}
            onClick={() => {
              if (done) actions.reopen(loop.id);
              else actions.complete(loop.id);
              onClose();
            }}
          >
            {done ? "Mark not done" : loop.requiresResponse ? "Mark replied" : "Done"}
          </Button>
          {!done && (
            <Button variant="secondary" onClick={() => setRescheduling((r) => !r)} aria-expanded={rescheduling}>
              Reschedule
            </Button>
          )}
          {!done && (
            <Menu
              label="Snooze"
              items={SNOOZE_OPTIONS.map((o) => ({ label: `Snooze until ${o.label.toLowerCase()}`, onSelect: () => { actions.snooze(loop.id, o.until, o.label); onClose(); } }))}
              trigger={<span className="px-2 text-[15px] font-medium text-ink-2">Snooze</span>}
            />
          )}
          <div className="ml-auto">
            <Menu
              label="More options"
              items={[
                ...(editable ? [{ label: "Edit title", icon: <Pencil size={16} />, onSelect: () => setEditing(true) }] : []),
                { label: "Not important", onSelect: () => { actions.notImportant(loop); onClose(); } },
                { label: "Remove", tone: "danger" as const, onSelect: () => { actions.remove(loop.id); onClose(); } },
              ]}
            />
          </div>
        </div>
      }
    >
      {editing && (
        <form
          className="mb-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            dispatch({ type: "EDIT_LOOP", id: loop.id, patch: { title: title.trim() } });
            notify("Updated.", { undoable: true });
            setEditing(false);
          }}
        >
          <label className="sr-only" htmlFor="loop-title">Title</label>
          <input id="loop-title" value={title} onChange={(e) => setTitle(e.target.value)} className="min-h-10 flex-1 rounded-xl border border-line-strong px-3" data-autofocus />
          <Button type="submit" variant="primary" size="sm">Save</Button>
        </form>
      )}

      {loop.description && <p className="mb-4 text-[15px] text-ink-2">{loop.description}</p>}

      {loop.why && (
        <div className="mb-5 rounded-2xl bg-accent-soft px-4 py-3">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-accent-strong">Why this matters</p>
          <p className="mt-0.5 text-[15px] text-ink">{loop.why}</p>
        </div>
      )}

      {rescheduling && (
        <form
          className="mb-5 animate-rise-in rounded-2xl border border-line p-4"
          onSubmit={(e) => {
            e.preventDefault();
            actions.reschedule(loop.id, `${date}T${time || "23:59"}`);
            setRescheduling(false);
          }}
        >
          <p className="mb-3 text-[15px] font-semibold">New date</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              { label: "Tomorrow", value: "2026-10-10" },
              { label: "Monday", value: "2026-10-12" },
              { label: "Next week", value: "2026-10-16" },
            ].map((q) => (
              <button key={q.label} type="button" onClick={() => setDate(q.value)} className={`min-h-9 rounded-full border px-3 text-[14px] ${date === q.value ? "border-ink bg-ink text-white" : "border-line-strong"}`}>
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col text-[13px] text-ink-3">
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 min-h-10 rounded-xl border border-line-strong px-3 text-[15px] text-ink" />
            </label>
            <label className="flex flex-col text-[13px] text-ink-3">
              Time
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 min-h-10 rounded-xl border border-line-strong px-3 text-[15px] text-ink" />
            </label>
          </div>
          {loop.derivedFrom === "assignment" && <p className="mt-3 text-[13.5px] text-ink-3">This changes the date ORBIT tracks. It doesn&apos;t change anything in Canvas.</p>}
          <div className="mt-4 flex gap-2">
            <Button type="submit" size="sm" variant="primary">Save date</Button>
            <Button size="sm" variant="ghost" onClick={() => setRescheduling(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <dl>
        <DetailRow label="Due">
          {loop.deadline ? (
            <>
              {relativeDateTime(loop.deadline, derived.today)}
              <span className="block text-[13.5px] text-ink-3">
                {formatLongDate(datePart(loop.deadline))}
                {timePart(loop.deadline) && timePart(loop.deadline) !== "23:59" ? ` · ${formatTime(timePart(loop.deadline))}` : " · by midnight"}
                {loop.hardDeadline ? " · Hard deadline" : " · Flexible"}
              </span>
            </>
          ) : (
            "No deadline"
          )}
        </DetailRow>
        {course && (
          <DetailRow label="Course">
            <Link href={`/courses/${course.id}`} onClick={onClose} className="text-accent hover:underline">
              {course.code} · {course.name}
            </Link>
          </DetailRow>
        )}
        <DetailRow label="Category">
          {CATEGORY_LABEL[loop.category]} · {CONSEQUENCE_LABEL[loop.consequence]}
          {loop.moneyAtRisk && loop.moneyAtRisk > 1 ? ` · $${loop.moneyAtRisk} at stake` : ""}
        </DetailRow>
        {loop.waitingOn && <DetailRow label="Waiting on">{loop.waitingOn}</DetailRow>}
        <DetailRow label="Source">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={loop.source} className="text-[14.5px] text-ink" />
            {loop.confidence < 0.85 && <ConfidenceTag confidence={loop.confidence} />}
          </div>
          {loop.messageId && (
            <button type="button" onClick={() => open({ type: "message", id: loop.messageId! })} className="mt-1 inline-flex items-center gap-1.5 text-[14px] font-medium text-accent hover:underline">
              <Mail size={14} aria-hidden /> Open original message
            </button>
          )}
        </DetailRow>
      </dl>

      {!done && (
        <div className="mt-6 space-y-4">
          <div>
            <p id="status-label" className="mb-2 text-[14px] font-medium text-ink-2">Status{loop.snoozed ? " · snoozed" : ""}</p>
            <SegmentedControl<LoopStatus>
              label="Status"
              value={loop.status}
              onChange={(s) => actions.setStatus(loop.id, s)}
              options={[
                { value: "now", label: "Now" },
                { value: "soon", label: "Soon" },
                { value: "later", label: "Later" },
                { value: "waiting", label: "Waiting" },
              ]}
            />
            {loop.snoozed && (
              <button type="button" onClick={() => actions.unsnooze(loop.id)} className="ml-3 text-[14px] font-medium text-accent hover:underline">
                Unsnooze
              </button>
            )}
          </div>
          <div>
            <p className="mb-2 text-[14px] font-medium text-ink-2">Priority</p>
            <SegmentedControl<PriorityLevel>
              label="Priority"
              value={loop.priority}
              onChange={(p) => actions.setPriority(loop.id, p)}
              options={[
                { value: "high", label: "High" },
                { value: "medium", label: "Normal" },
                { value: "low", label: "Low" },
              ]}
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}

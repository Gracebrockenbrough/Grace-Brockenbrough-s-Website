"use client";

import Link from "next/link";
import { GitCompareArrows, Lock } from "lucide-react";
import { formatLongDate, formatTimeRange } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Drawer, DetailRow } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";
import { ConfidenceTag, SourceBadge } from "@/components/ui/Badges";
import { EVENT_META as CATEGORY_META } from "@/components/calendar/eventStyle";
import { describeWhen } from "@/services/changes";
import { findCalendarItem } from "./lookup";

export function EventDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, derived, dispatch } = useOrbit();
  const { open, notify } = useUI();
  const item = findCalendarItem(id, state, derived);

  if (!item) {
    return (
      <Drawer title="Event not found" onClose={onClose}>
        <p className="text-ink-2">It may have been moved or removed.</p>
      </Drawer>
    );
  }

  const course = state.courses.find((c) => c.id === item.courseId);
  const meta = CATEGORY_META[item.category];
  const change = item.pendingChange ? derived.changes.find((c) => c.id === item.pendingChange) : undefined;
  const conflict = derived.timeConflicts.find((c) => c.itemIds.includes(item.id));
  const removable = item.kind === "event" && !item.hardCommitment;
  const title = item.kind === "class" && course ? `${course.code} · ${course.name}` : item.title;

  return (
    <Drawer
      title={title}
      onClose={onClose}
      eyebrow={<span className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">{meta.label}</span>}
      footer={
        <div className="flex flex-wrap gap-2">
          {course && (
            <Link href={`/courses/${course.id}`} onClick={onClose} className="inline-flex min-h-10 items-center rounded-xl border border-line-strong px-4 text-[15px] font-medium hover:bg-sunken">
              Open {course.code}
            </Link>
          )}
          <Link
            href={`/calendar?view=day&date=${item.date}`}
            onClick={onClose}
            className="inline-flex min-h-10 items-center rounded-xl border border-line-strong px-4 text-[15px] font-medium hover:bg-sunken"
          >
            See the day
          </Link>
          {removable && (
            <Button
              variant="danger"
              className="ml-auto"
              onClick={() => {
                dispatch({ type: "REMOVE_EVENT", id: item.refId });
                notify(`Removed “${item.title}”.`, { undoable: true });
                onClose();
              }}
            >
              Remove
            </Button>
          )}
        </div>
      }
    >
      {change && (
        <div className="mb-4 rounded-2xl border border-attention-line bg-attention-soft p-4">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-attention">
            <GitCompareArrows size={17} aria-hidden /> This may have moved
          </p>
          <p className="mt-1 text-[14.5px] text-ink">
            {change.source.label} says {describeWhen(change.newValue)}. Your calendar still shows the original time.
          </p>
          <Button size="sm" variant="primary" className="mt-3" onClick={() => open({ type: "change", id: change.id })}>
            Review change
          </Button>
        </div>
      )}
      {conflict && (
        <div className="mb-4 rounded-2xl border border-attention-line bg-attention-soft p-4">
          <p className="text-[15px] font-semibold text-attention">Overlaps with another event</p>
          <p className="mt-1 text-[14.5px] text-ink">{conflict.summary}</p>
          <Button size="sm" variant="primary" className="mt-3" onClick={() => open({ type: "conflict", id: conflict.id })}>
            Review options
          </Button>
        </div>
      )}
      <dl>
        <DetailRow label="When">
          {formatLongDate(item.date)}
          <span className="block text-[14px] text-ink-3">{formatTimeRange(item.startTime, item.endTime)}</span>
        </DetailRow>
        {item.location && <DetailRow label="Where">{item.location}</DetailRow>}
        {course && item.kind !== "class" && <DetailRow label="Course">{course.code} · {course.name}</DetailRow>}
        {item.kind === "class" && course && <DetailRow label="Professor">{course.professor}</DetailRow>}
        <DetailRow label="Source">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={item.source} className="text-[14.5px] text-ink" />
            {item.confidence < 0.9 && <ConfidenceTag confidence={item.confidence} />}
          </div>
        </DetailRow>
      </dl>
      {item.hardCommitment && (
        <p className="mt-5 flex items-start gap-2 rounded-xl bg-sunken px-3 py-2.5 text-[14px] text-ink-2">
          <Lock size={15} className="mt-0.5 shrink-0" aria-hidden />
          This is a real commitment. ORBIT will never move or cancel it without asking you first.
        </p>
      )}
    </Drawer>
  );
}

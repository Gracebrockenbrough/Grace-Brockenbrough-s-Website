"use client";

import Link from "next/link";
import { FileUp } from "lucide-react";
import type { Course } from "@/types";
import { datePart, relativeDay, WEEKDAYS_SHORT, formatTimeRange } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";

/** The closest assignment or exam for a course. */
export function useNextUp(courseId: string) {
  const { state, derived } = useOrbit();
  const assignments = state.assignments
    .filter((a) => a.courseId === courseId && !a.completed && a.due && datePart(a.due) >= derived.today)
    .map((a) => ({ id: a.id, title: a.title, date: datePart(a.due!), kind: "assignment" as const }));
  const exams = state.exams
    .filter((x) => x.courseId === courseId && x.date && x.date >= derived.today)
    .map((x) => ({ id: x.id, title: x.title.replace(/^[A-Z]+ \d+ /, ""), date: x.date!, kind: "exam" as const }));
  return [...assignments, ...exams].sort((a, b) => a.date.localeCompare(b.date))[0];
}

export function meetingSummary(c: Course): string {
  return `${c.meetingDays.map((d) => WEEKDAYS_SHORT[d]).join(" · ")} · ${formatTimeRange(c.startTime, c.endTime)}`;
}

export function CourseCard({ course }: { course: Course }) {
  const { derived } = useOrbit();
  const next = useNextUp(course.id);
  const hasSyllabus = !!course.syllabusDocumentId;
  const updates = derived.changes.filter((c) => c.courseId === course.id).length;

  return (
    <li>
      <Link href={`/courses/${course.id}`} className="group block rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-raised">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold tracking-wide text-academic">{course.code}</p>
            <p className="mt-0.5 text-[19px] font-semibold leading-snug text-ink">{course.name}</p>
          </div>
          {updates > 0 && <span className="shrink-0 rounded-full bg-attention-soft px-2.5 py-0.5 text-[13px] font-semibold text-attention">{updates} update{updates > 1 ? "s" : ""}</span>}
        </div>
        <p className="mt-4 text-[15.5px] text-ink">
          {next ? (
            <>
              <span className="text-ink-3">Next: </span>
              {next.title} · {relativeDay(next.date, derived.today)}
            </>
          ) : hasSyllabus ? (
            <span className="text-ink-3">Nothing coming up</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-accent"><FileUp size={15} aria-hidden /> Add the syllabus</span>
          )}
        </p>
      </Link>
    </li>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, FileUp } from "lucide-react";
import type { Course } from "@/types";
import { cn } from "@/lib/cn";
import { datePart, relativeDay, WEEKDAYS_SHORT, formatTimeRange } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { COURSE_COLOR } from "@/components/ui/Badges";

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
  const { derived, state } = useOrbit();
  const next = useNextUp(course.id);
  const color = COURSE_COLOR[course.color];
  const hasSyllabus = !!course.syllabusDocumentId;
  const pendingChange = derived.changes.some((c) => c.courseId === course.id);
  const open = state.assignments.filter((a) => a.courseId === course.id && !a.completed && a.due && a.due >= derived.today).length;

  return (
    <li className="group relative overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-shadow hover:shadow-raised">
      <span className={cn("absolute inset-y-0 left-0 w-1.5", color.bar)} aria-hidden />
      <Link href={`/courses/${course.id}`} className="block p-5 pl-6">
        <p className={cn("text-[14px] font-semibold tracking-wide", color.text)}>{course.code}</p>
        <p className="mt-0.5 text-[19px] font-semibold leading-snug text-ink">{course.name}</p>
        <p className="mt-1 text-[14px] text-ink-3">
          {course.professor.replace("Professor ", "Prof. ")} · {meetingSummary(course)}
        </p>
        <div className="mt-4 rounded-xl bg-canvas px-3.5 py-2.5">
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-ink-3">Next</p>
          {next ? (
            <p className="mt-0.5 text-[15.5px] text-ink">
              <span className="font-medium">{next.title}</span> · {relativeDay(next.date, derived.today)}
            </p>
          ) : hasSyllabus ? (
            <p className="mt-0.5 text-[15px] text-ink-2">Nothing coming up</p>
          ) : (
            <p className="mt-0.5 flex items-center gap-1.5 text-[15px] text-accent">
              <FileUp size={15} aria-hidden /> Upload the syllabus to see what&apos;s coming
            </p>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-[13.5px] text-ink-3">
          <span>{hasSyllabus ? `${open} upcoming ${open === 1 ? "assignment" : "assignments"}` : "No syllabus yet"}</span>
          {pendingChange ? <span className="font-medium text-attention">Date change detected</span> : <ArrowRight size={16} className="text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />}
        </div>
      </Link>
    </li>
  );
}

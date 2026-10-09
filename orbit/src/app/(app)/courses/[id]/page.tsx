"use client";

import Link from "next/link";
import { use, useState } from "react";
import { ArrowLeft, Check, FileText, FileUp, GraduationCap, Mail, MapPin, Clock, GitCompareArrows } from "lucide-react";
import type { Assignment } from "@/types";
import { cn } from "@/lib/cn";
import { datePart, formatShortDate, formatTime, formatMonthDay, relativeDateTime, relativeDay, timePart } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Card, EmptyState, SectionHeader } from "@/components/ui/Card";
import { COURSE_COLOR, ConfidenceTag, SourceBadge } from "@/components/ui/Badges";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { meetingSummary, useNextUp } from "@/components/courses/CourseCard";

function AssignmentRow({ a }: { a: Assignment }) {
  const { derived, dispatch } = useOrbit();
  const { open, notify } = useUI();
  return (
    <li className="flex items-start gap-3 py-3">
      <button
        type="button"
        aria-pressed={a.completed}
        aria-label={a.completed ? `Mark “${a.title}” not done` : `Mark “${a.title}” done`}
        onClick={() => {
          dispatch({ type: "TOGGLE_ASSIGNMENT", id: a.id });
          notify(a.completed ? "Marked not done." : `Done: ${a.title}`, { undoable: true });
        }}
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
          a.completed ? "border-success bg-success text-white" : "border-line-strong text-transparent hover:border-success hover:text-success",
        )}
      >
        <Check size={14} strokeWidth={3} aria-hidden />
      </button>
      <button type="button" onClick={() => open({ type: "loop", id: `asg:${a.id}` })} className="min-w-0 flex-1 text-left">
        <span className={cn("block text-[15.5px] font-medium", a.completed ? "text-ink-3 line-through" : "text-ink")}>{a.title}</span>
        <span className="block text-[13.5px] text-ink-3">
          {a.due ? `${formatShortDate(datePart(a.due))}${timePart(a.due) !== "23:59" ? ` · ${formatTime(timePart(a.due))}` : ""}` : "Date unclear"}
          {a.note ? ` · ${a.note}` : ""}
        </span>
      </button>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {a.due && !a.completed && <span className="text-[13.5px] text-ink-2">{relativeDateTime(a.due, derived.today)}</span>}
        {a.confidence < 0.85 && <ConfidenceTag confidence={a.confidence} />}
      </div>
    </li>
  );
}

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, derived } = useOrbit();
  const { open } = useUI();
  const [tab, setTab] = useState<"upcoming" | "completed">("upcoming");
  const course = state.courses.find((c) => c.id === id);
  const next = useNextUp(id);

  if (!course) {
    return (
      <div>
        <Link href="/courses" className="mb-6 inline-flex min-h-10 items-center gap-1.5 text-[15px] text-ink-2 hover:text-ink">
          <ArrowLeft size={17} aria-hidden /> Courses
        </Link>
        <EmptyState title="Course not found" body="It may have been removed. Your other courses are still here." />
      </div>
    );
  }

  const color = COURSE_COLOR[course.color];
  const assignments = state.assignments.filter((a) => a.courseId === id).sort((a, b) => (a.due ?? "9").localeCompare(b.due ?? "9"));
  const upcoming = assignments.filter((a) => !a.completed);
  const completed = assignments.filter((a) => a.completed);
  const exams = state.exams.filter((x) => x.courseId === id).sort((a, b) => (a.date ?? "9").localeCompare(b.date ?? "9"));
  const milestones = state.milestones.filter((m) => m.courseId === id).sort((a, b) => (a.date ?? "9").localeCompare(b.date ?? "9"));
  const documents = state.documents.filter((d) => d.courseId === id);
  const changes = derived.changes.filter((c) => c.courseId === id);
  const hasSyllabus = !!course.syllabusDocumentId;

  return (
    <div>
      <Link href="/courses" className="mb-4 inline-flex min-h-10 items-center gap-1.5 rounded-lg text-[15px] text-ink-2 hover:text-ink">
        <ArrowLeft size={17} aria-hidden /> Courses
      </Link>

      <header className="mb-8">
        <p className={cn("text-[15px] font-semibold tracking-wide", color.text)}>{course.code}</p>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight md:text-[32px]">{course.name}</h1>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-ink-2">
          <span className="inline-flex items-center gap-1.5"><Clock size={15} aria-hidden /> {meetingSummary(course)}</span>
          <span className="inline-flex items-center gap-1.5"><MapPin size={15} aria-hidden /> {course.location}</span>
          <span className="inline-flex items-center gap-1.5"><GraduationCap size={15} aria-hidden /> {course.professor}</span>
        </div>
      </header>

      {changes.map((c) => (
        <div key={c.id} className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-attention-line bg-attention-soft px-4 py-3">
          <GitCompareArrows size={18} className="text-attention" aria-hidden />
          <p className="flex-1 text-[15px]">
            <span className="font-semibold">{c.title}</span> {c.confidence >= 0.8 ? "appears to have moved." : "may have moved."}
          </p>
          <button type="button" onClick={() => open({ type: "change", id: c.id })} className="min-h-9 rounded-xl bg-accent px-3 text-[14px] font-medium text-white hover:bg-accent-strong">
            Review
          </button>
        </div>
      ))}

      {!hasSyllabus && (
        <div className="mb-8 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-accent-line bg-accent-soft/40 p-5 md:flex-row md:items-center">
          <FileUp size={24} className="text-accent" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold">No syllabus yet</p>
            <p className="text-[15px] text-ink-2">Upload it and ORBIT will find every assignment and exam date for you to confirm.</p>
          </div>
          <Link href={`/courses/upload?course=${course.id}`} className="inline-flex min-h-10 items-center rounded-xl bg-accent px-4 text-[15px] font-medium text-white hover:bg-accent-strong">
            Upload syllabus
          </Link>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-10">
          {next && (
            <section aria-labelledby="next-up">
              <SectionHeader id="next-up" title="Next up" />
              <Card className="flex items-center gap-4 p-5">
                <span className={cn("flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl", color.soft, color.text)}>
                  <span className="text-[11px] font-semibold uppercase">{formatMonthDay(next.date).split(" ")[0]}</span>
                  <span className="text-[18px] font-semibold leading-none">{formatMonthDay(next.date).split(" ")[1]}</span>
                </span>
                <div>
                  <p className="text-[17px] font-semibold">{next.title}</p>
                  <p className="text-[15px] text-ink-2">{next.kind === "exam" ? "Exam" : "Assignment"} · {relativeDay(next.date, derived.today)}</p>
                </div>
              </Card>
            </section>
          )}

          <section aria-labelledby="assignments">
            <SectionHeader
              id="assignments"
              title="Assignments"
              action={
                <SegmentedControl
                  label="Assignment filter"
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: "upcoming", label: "Upcoming", count: upcoming.length },
                    { value: "completed", label: "Completed", count: completed.length },
                  ]}
                />
              }
            />
            {(tab === "upcoming" ? upcoming : completed).length ? (
              <Card className="px-4 md:px-5">
                <ul className="divide-y divide-line">
                  {(tab === "upcoming" ? upcoming : completed).map((a) => (
                    <AssignmentRow key={a.id} a={a} />
                  ))}
                </ul>
              </Card>
            ) : (
              <p className="rounded-2xl border border-dashed border-line-strong px-4 py-5 text-[15px] text-ink-2">
                {tab === "upcoming" ? (hasSyllabus ? "You're caught up in this class." : "Upload the syllabus and assignments will appear here.") : "Nothing completed yet."}
              </p>
            )}
          </section>

          <section aria-labelledby="exams">
            <SectionHeader id="exams" title="Exams" />
            {exams.length ? (
              <Card className="divide-y divide-line px-4 md:px-5">
                {exams.map((x) => (
                  <div key={x.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-[15.5px] font-medium">{x.title.replace(`${course.code} `, "")}</p>
                      <p className="text-[13.5px] text-ink-3">
                        {x.date ? `${formatShortDate(x.date)}${x.startTime ? ` · ${formatTime(x.startTime)}` : ""}` : "Date not announced"}
                        {x.location ? ` · ${x.location}` : ""}
                      </p>
                    </div>
                    {x.date ? (
                      <button type="button" onClick={() => open({ type: "event", id: `exam:${x.id}` })} className="text-[14px] font-medium text-accent hover:underline">
                        Details
                      </button>
                    ) : (
                      <button type="button" onClick={() => open({ type: "attention", id: `missing:${x.id}` })} className="text-[14px] font-medium text-accent hover:underline">
                        Add date
                      </button>
                    )}
                  </div>
                ))}
              </Card>
            ) : (
              <p className="rounded-2xl border border-dashed border-line-strong px-4 py-5 text-[15px] text-ink-2">No exams found yet.</p>
            )}
          </section>

          {milestones.length > 0 && (
            <section aria-labelledby="schedule">
              <SectionHeader id="schedule" title="Course schedule" />
              <Card className="divide-y divide-line px-4 md:px-5">
                {milestones.map((m) => (
                  <div key={m.id} className="flex justify-between gap-3 py-3 text-[15px]">
                    <span>{m.title}</span>
                    <span className="shrink-0 text-ink-3">{m.date ? formatShortDate(m.date) : "TBA"}</span>
                  </div>
                ))}
              </Card>
            </section>
          )}
        </div>

        <aside className="space-y-10">
          <section aria-labelledby="professor">
            <SectionHeader id="professor" title="Professor" />
            <Card className="p-5">
              <p className="text-[16px] font-semibold">{course.professor}</p>
              <a href={`mailto:${course.professorEmail}`} className="mt-1 inline-flex items-center gap-1.5 text-[15px] text-accent hover:underline">
                <Mail size={15} aria-hidden /> {course.professorEmail}
              </a>
              <div className="mt-4">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">Office hours</p>
                <p className="mt-0.5 text-[15px]">{course.officeHours}</p>
                {course.officeHoursSource && <SourceBadge source={course.officeHoursSource} className="mt-1" />}
              </div>
            </Card>
          </section>

          <section aria-labelledby="documents">
            <SectionHeader
              id="documents"
              title="Documents"
              action={
                <Link href={`/courses/upload?course=${course.id}`} className="text-[14.5px] font-medium text-accent hover:underline">
                  Upload
                </Link>
              }
            />
            {documents.length ? (
              <Card className="divide-y divide-line">
                {documents.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                    <FileText size={18} className="shrink-0 text-ink-3" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium">{d.name}</p>
                      <p className="text-[13px] text-ink-3">
                        {d.kind === "syllabus" ? "Syllabus" : "Course material"} · added {formatShortDate(d.addedAt)}{d.pages ? ` · ${d.pages} pages` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </Card>
            ) : (
              <p className="rounded-2xl border border-dashed border-line-strong px-4 py-5 text-[15px] text-ink-2">No documents yet.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

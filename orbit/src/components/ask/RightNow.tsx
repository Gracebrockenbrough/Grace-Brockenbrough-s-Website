"use client";

import { ArrowRight, CalendarPlus, ExternalLink, PenLine } from "lucide-react";
import type { Category } from "@/types";
import { AREA_STYLE } from "@/lib/areas";
import { cn } from "@/lib/cn";
import { addMinutesToTime, formatDuration, formatTime, formatTimeRange } from "@/lib/time";
import { APP_LINKS } from "@/lib/handoff";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { usePlanBlock } from "@/store/useActions";
import { taskDetail } from "@/components/loops/TaskRow";

interface Idea {
  id: string;
  title: string;
  why: string;
  minutes: number;
  area: Category;
  loopId?: string;
  examId?: string;
  courseId?: string;
}

/**
 * Ask ORBIT opens with an answer already: the one thing that matters most,
 * the next stretch of free time, and a few good ways to use it.
 */
export function RightNow() {
  const { derived } = useOrbit();
  const { open } = useUI();
  const plan = usePlanBlock();
  const top = derived.priorities[0];
  const free = derived.freeTime[0];
  const study = derived.study.find((s) => !s.studiedToday && s.studied.length < s.target);
  const step = derived.goals.map((g) => ({ ...g, s: g.progress.today && !g.progress.today.done ? g.progress.today : undefined })).find((g) => g.s);
  const nextRun = derived.goals.find((g) => g.goal.kind === "run")?.progress.next;

  const ideas: Idea[] = [];
  if (free) ideas.push({ id: free.id, title: free.planTitle, why: free.detail, minutes: Math.min(free.minutes, 90), area: "school", loopId: free.loopId, courseId: free.courseId });
  if (study && !ideas.some((i) => i.examId === study.exam.id || i.loopId === `exam:${study.exam.id}`))
    ideas.push({ id: `study-${study.exam.id}`, title: `Study for ${study.exam.title}`, why: `Studied ${study.studied.length}/${study.target} days so far`, minutes: 60, area: "school", examId: study.exam.id, courseId: study.exam.courseId });
  if (step?.s) ideas.push({ id: step.s.id, title: step.s.title, why: step.goal.title, minutes: step.s.minutes ?? 30, area: step.goal.area });
  else if (nextRun) ideas.push({ id: nextRun.id, title: nextRun.title, why: "Get ahead on your 5K plan", minutes: nextRun.minutes ?? 30, area: "wellness" });
  ideas.push({ id: "reset", title: "Take a real break", why: "A walk outside counts", minutes: 20, area: "wellness" });

  return (
    <section aria-label="Right now" className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
      {top && (
        <div className="paper flex flex-col rounded-3xl p-5 shadow-raised">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-navy-2">Most important right now</p>
          <p className="mt-2 font-display text-[26px] leading-tight">{top.title}</p>
          <p className="mt-1 text-[15px] text-navy-2">{taskDetail(top, derived.now)}{top.why ? ` · ${top.why}` : ""}</p>
          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            <button type="button" onClick={() => open({ type: "loop", id: top.id })} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-navy px-4 text-[15px] font-medium text-cream hover:bg-navy/90">
              Start <ArrowRight size={16} aria-hidden />
            </button>
            {derived.priorities[1] && (
              <button type="button" onClick={() => open({ type: "loop", id: derived.priorities[1].id })} className="inline-flex min-h-10 items-center rounded-xl px-3 text-[14.5px] text-navy-2 hover:text-navy">
                Then: {derived.priorities[1].title}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-line bg-surface p-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">Your free time</p>
        {free ? (
          <>
            <p className="mt-2 font-display text-[22px] leading-tight">
              {formatDuration(free.minutes)} free at {formatTime(free.start)}
            </p>
            <p className="text-[14px] text-ink-3">Here&apos;s what you could do with it:</p>
            <ul className="mt-3 space-y-1.5">
              {ideas.slice(0, 3).map((i) => {
                const end = addMinutesToTime(free.start, i.minutes);
                return (
                  <li key={i.id} className="flex items-center gap-3 rounded-xl bg-sunken px-3 py-2">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", AREA_STYLE[i.area].dot)} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{i.title}</span>
                      <span className="block truncate text-[13px] text-ink-3">{formatTimeRange(free.start, end)} · {i.why}</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Add ${i.title} to calendar`}
                      onClick={() => plan({ title: i.title, date: free.date, start: free.start, end, loopId: i.loopId, examId: i.examId, courseId: i.courseId, category: i.area === "school" ? "study" : "personal" })}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-accent hover:bg-accent-soft"
                    >
                      <CalendarPlus size={17} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-[15px] text-ink-2">No long gaps left today. Tomorrow evening is open.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 md:col-span-2">
        <button type="button" onClick={() => open({ type: "compose" })} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-[14.5px] font-medium hover:border-accent">
          <PenLine size={16} className="text-accent" aria-hidden /> Help me write a text or email
        </button>
        <span className="ml-1 text-[13px] text-ink-3">Jump to</span>
        {[APP_LINKS.gmail, APP_LINKS.canvas, APP_LINKS.calendar, APP_LINKS.linkedin].map((a) => (
          <a key={a.label} href={a.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-full px-2.5 text-[14px] text-ink-2 hover:bg-sunken hover:text-ink">
            {a.label} <ExternalLink size={13} aria-hidden />
          </a>
        ))}
      </div>
    </section>
  );
}

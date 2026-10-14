"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft, ChevronRight, PenLine, Plus } from "lucide-react";
import { areaBlurb, areaLabel, areaSlug, areaStyle, isArea } from "@/lib/areas";
import { cn } from "@/lib/cn";
import { formatTimeRange, relativeDay } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { GoalCard } from "@/components/goals/GoalCard";
import { StudyMoons } from "@/components/goals/StudyMoons";
import { TaskRow } from "@/components/loops/TaskRow";
import { EVENT_META } from "@/components/calendar/eventStyle";

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-[15px] font-semibold text-ink-2">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** One part of life up close: what's open, what's coming, and any goals. */
export default function AreaPage({ params }: { params: Promise<{ area: string }> }) {
  const raw = safeDecode(use(params).area);
  const { derived, state } = useOrbit();
  const { open } = useUI();
  const summary = isArea(raw) ? derived.areas.find((a) => a.area === raw) : undefined;

  if (!summary) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-2">That area isn&apos;t in your Orbit.</p>
        <Link href="/orbit" className="mt-4 inline-block text-accent">Back to your Orbit</Link>
      </div>
    );
  }
  const area = summary.area;
  const style = areaStyle(area);
  const items = summary.items.filter((i) => i.kind !== "class" && i.kind !== "deadline" && i.date >= derived.today).slice(0, 6);
  const writes = area === "career" || area === "work" ? "email" : area === "social" || area === "family" ? "text" : undefined;

  return (
    <div className="space-y-7">
      <Link href="/orbit" className="inline-flex min-h-9 items-center gap-1.5 px-1 text-[14.5px] text-ink-2 hover:text-ink">
        <ArrowLeft size={16} aria-hidden /> Your Orbit
      </Link>

      <nav aria-label="Parts of life" className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
        {derived.areas.map(({ area: a }) => {
          const active = a === area;
          return (
            <Link
              key={a}
              href={`/orbit/${areaSlug(a)}`}
              aria-current={active ? "page" : undefined}
              className={cn("inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium", active ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink")}
            >
              <span className={cn("h-2 w-2 rounded-full", areaStyle(a).dot)} aria-hidden />
              {areaLabel(a)}
            </Link>
          );
        })}
      </nav>

      <header className="px-1">
        <h1 className="flex items-center gap-3 text-[34px] leading-tight">
          <span className={cn("h-3 w-3 rounded-full", style.dot)} aria-hidden />
          {areaLabel(area)}
        </h1>
        <p className="mt-1 text-[15.5px] text-ink-2">{summary.note || areaBlurb(area)}</p>
      </header>

      {summary.study.length > 0 && (
        <Section title="Studying for">
          <div className="space-y-2.5">
            {summary.study.map((s) => (
              <StudyMoons key={s.exam.id} study={s} />
            ))}
          </div>
        </Section>
      )}

      <Section
        title="Open loops"
        action={
          <button type="button" onClick={() => open({ type: "capture" })} className="inline-flex items-center gap-1 text-[14px] font-medium text-accent">
            <Plus size={15} aria-hidden /> Add
          </button>
        }
      >
        {summary.loops.length ? (
          <ul className="divide-y divide-line rounded-2xl bg-surface shadow-card">
            {summary.loops.map((l) => (
              <TaskRow key={l.id} loop={l} area="tasks" showStep />
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-surface px-4 py-4 text-[15px] text-ink-2 shadow-card">Nothing open here.</p>
        )}
      </Section>

      {items.length > 0 && (
        <Section title="Coming up">
          <ul className="rounded-2xl bg-surface py-1.5 shadow-card">
            {items.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => open({ type: "event", id: i.id })} className="flex w-full items-center gap-3 px-4 py-2.5 text-left">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", EVENT_META[i.category].dot)} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[15px]">{i.title}</span>
                  <span className="shrink-0 text-[13.5px] text-ink-3">
                    {relativeDay(i.date, derived.today)}
                    {i.startTime ? ` · ${formatTimeRange(i.startTime, i.endTime).split(" – ")[0]}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        title="Goals"
        action={
          <button type="button" onClick={() => open({ type: "newGoal", area })} className="inline-flex items-center gap-1 text-[14px] font-medium text-accent">
            <Plus size={15} aria-hidden /> New goal
          </button>
        }
      >
        {summary.goals.length ? (
          <div className="space-y-2.5">
            {summary.goals.map(({ goal, progress }) => (
              <GoalCard key={goal.id} goal={goal} progress={progress} />
            ))}
          </div>
        ) : (
          <button type="button" onClick={() => open({ type: "newGoal", area })} className="w-full rounded-2xl bg-surface p-4 text-left text-[15px] text-ink-2 shadow-card">
            {area === "health" ? "“Run a 5K next month” becomes a plan you can check off." : "Tell Orbit what you're working toward and it'll break it into small steps."}
          </button>
        )}
      </Section>

      {area === "school" && (state.courses.length > 0 || state.mode === "demo") && (
        <Section title="Courses">
          <ul className="divide-y divide-line rounded-2xl bg-surface shadow-card">
            {state.courses.map((c) => (
              <li key={c.id}>
                <Link href={`/courses/${c.id}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15.5px] font-medium">{c.code}</span>
                    <span className="block truncate text-[13.5px] text-ink-3">{c.name}</span>
                  </span>
                  <ChevronRight size={16} className="text-ink-3" aria-hidden />
                </Link>
              </li>
            ))}
            {state.mode === "demo" && (
              <li>
                <Link href="/courses/upload" className="flex items-center gap-3 px-4 py-3 text-[15px] text-accent">
                  <Plus size={16} aria-hidden /> Add a syllabus
                </Link>
              </li>
            )}
          </ul>
        </Section>
      )}

      {writes && (
        <button type="button" onClick={() => open({ type: "compose", kind: writes })} className="flex w-full items-center gap-3 rounded-2xl bg-surface p-4 text-left shadow-card">
          <PenLine size={18} className="text-accent" aria-hidden />
          <span>
            <span className="block text-[15.5px] font-medium">Help me write {writes === "email" ? "an email" : "a text"}</span>
            <span className="block text-[13.5px] text-ink-3">Orbit drafts it. You copy it and send it yourself.</span>
          </span>
        </button>
      )}
    </div>
  );
}

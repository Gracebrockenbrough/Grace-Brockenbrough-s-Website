"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft, ChevronRight, PenLine, Plus } from "lucide-react";
import { AREA_LABEL, AREA_ORDER, AREA_STYLE, isArea } from "@/lib/areas";
import { cn } from "@/lib/cn";
import { formatTimeRange, relativeDay } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Planet } from "@/components/areas/Planet";
import { GoalCard } from "@/components/goals/GoalCard";
import { StudyMoons } from "@/components/goals/StudyMoons";
import { TaskRow } from "@/components/loops/TaskRow";
import { EVENT_META } from "@/components/calendar/eventStyle";

function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  return <h2 className={cn("mb-3 text-[12px] font-semibold uppercase tracking-[0.14em]", color ?? "text-ink-3")}>{children}</h2>;
}

/** One planet up close: its tasks, plans, and goals — and nothing else. */
export default function AreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area: raw } = use(params);
  const { derived, state } = useOrbit();
  const { open } = useUI();

  if (!isArea(raw)) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-2">That part of your orbit doesn't exist.</p>
        <Link href="/orbit" className="mt-4 inline-block text-accent">Back to your orbit</Link>
      </div>
    );
  }
  const area = raw;
  const summary = derived.areas.find((a) => a.area === area)!;
  const style = AREA_STYLE[area];
  const items = summary.items.filter((i) => i.kind !== "class" && i.kind !== "deadline" && i.date >= derived.today).slice(0, 8);

  return (
    <div className="space-y-9">
      <Link href="/orbit" className="inline-flex min-h-9 items-center gap-1.5 text-[14.5px] text-ink-2 hover:text-ink">
        <ArrowLeft size={16} aria-hidden /> Your orbit
      </Link>

      <nav aria-label="Parts of life" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {AREA_ORDER.map((a) => {
          const active = a === area;
          return (
            <Link
              key={a}
              href={`/orbit/${a}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[14.5px] font-medium transition-colors",
                active ? `${AREA_STYLE[a].border} ${AREA_STYLE[a].soft} text-ink` : "border-line text-ink-3 hover:text-ink",
              )}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", AREA_STYLE[a].dot)} aria-hidden />
              {AREA_LABEL[a]}
            </Link>
          );
        })}
      </nav>

      <header className="flex items-center gap-6">
        <Planet area={area} size={88} ring glow />
        <div className="min-w-0">
          <p className={cn("text-[12px] font-semibold uppercase tracking-[0.16em]", style.text)}>{style.blurb}</p>
          <h1 className="text-[38px] leading-tight">{AREA_LABEL[area]}</h1>
          <p className="text-[15.5px] text-ink-2">{summary.status}</p>
        </div>
      </header>

      {summary.study.length > 0 && (
        <section aria-label="Study progress">
          <Label color={style.text}>Studying for</Label>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
            {summary.study.map((s) => (
              <StudyMoons key={s.exam.id} study={s} />
            ))}
          </div>
        </section>
      )}

      <section aria-label="Goals">
        <div className="flex items-baseline justify-between">
          <Label color={style.text}>Goals</Label>
          <button type="button" onClick={() => open({ type: "newGoal", area })} className="inline-flex items-center gap-1 text-[14px] font-medium text-accent">
            <Plus size={15} aria-hidden /> New goal
          </button>
        </div>
        {summary.goals.length ? (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
            {summary.goals.map(({ goal, progress }) => (
              <GoalCard key={goal.id} goal={goal} progress={progress} />
            ))}
          </div>
        ) : (
          <button type="button" onClick={() => open({ type: "newGoal", area })} className="w-full rounded-2xl border border-dashed border-line-strong p-5 text-left hover:border-accent">
            <p className="text-[15.5px] font-medium">Set a {AREA_LABEL[area].toLowerCase()} goal</p>
            <p className="text-[14px] text-ink-3">
              {area === "wellness" ? "“Run a 5K next month” becomes a running plan you can check off." : "Tell ORBIT what you want and it breaks it into small weekly steps."}
            </p>
          </button>
        )}
      </section>

      <section aria-label="Tasks">
        <div className="flex items-baseline justify-between">
          <Label color={style.text}>To do</Label>
          <button type="button" onClick={() => open({ type: "capture" })} className="inline-flex items-center gap-1 text-[14px] font-medium text-accent">
            <Plus size={15} aria-hidden /> Add
          </button>
        </div>
        {summary.loops.length ? (
          <ul className="-mx-2">
            {summary.loops.map((l) => (
              <TaskRow key={l.id} loop={l} area="tasks" showStep />
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-ink-2">Nothing open here. Nice.</p>
        )}
      </section>

      {items.length > 0 && (
        <section aria-label="Coming up">
          <Label color={style.text}>Coming up</Label>
          <ul className="space-y-1">
            {items.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => open({ type: "event", id: i.id })} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface">
                  <span className={cn("h-9 w-1 shrink-0 rounded-full", EVENT_META[i.category].dot)} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15.5px]">{i.title}</span>
                    <span className="block text-[13.5px] text-ink-3">{relativeDay(i.date, derived.today)}{i.startTime ? ` · ${formatTimeRange(i.startTime, i.endTime)}` : ""}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {area === "school" && (
        <section aria-label="Courses">
          <Label color={style.text}>Courses</Label>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-2">
            {state.courses.map((c) => (
              <li key={c.id}>
                <Link href={`/courses/${c.id}`} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 hover:shadow-raised">
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold">{c.code}</span>
                    <span className="block truncate text-[13.5px] text-ink-3">{c.name}</span>
                  </span>
                  <ChevronRight size={16} className="text-ink-3" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/courses" className="mt-3 inline-flex text-[14.5px] font-medium text-accent">All courses & syllabi</Link>
        </section>
      )}

      {(area === "social" || area === "work") && (
        <button type="button" onClick={() => open({ type: "compose", kind: area === "work" ? "email" : "text" })} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left hover:shadow-raised">
          <PenLine size={18} className="text-accent" aria-hidden />
          <span>
            <span className="block text-[15.5px] font-medium">{area === "work" ? "Help me write an email" : "Help me write a text"}</span>
            <span className="block text-[13.5px] text-ink-3">ORBIT drafts it. You copy it and send it yourself.</span>
          </span>
        </button>
      )}
    </div>
  );
}

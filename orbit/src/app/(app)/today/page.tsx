"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Sunrise } from "lucide-react";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { formatLongDate } from "@/lib/time";
import { SectionHeader } from "@/components/ui/Card";
import { PriorityCard } from "@/components/today/PriorityCard";
import { Timeline } from "@/components/today/Timeline";
import { FreeTimeCard } from "@/components/today/FreeTimeCard";
import { NeedsAttention } from "@/components/today/NeedsAttention";
import { NeedsReplyCard } from "@/components/today/NeedsReplyCard";
import { ComingUp } from "@/components/today/ComingUp";

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function TodayPage() {
  const { state, derived } = useOrbit();
  const { open } = useUI();
  const { priorities, attention, needsReply, todayItems, freeTime, comingUp, today, now } = derived;

  const eventCount = todayItems.filter((i) => i.kind !== "deadline").length;
  const urgentAttention = attention.filter((a) => a.weight >= 60).length + needsReply.length;
  const summary = [
    priorities.length ? plural(priorities.length, "priority", "priorities") : "No urgent priorities",
    plural(eventCount, "event"),
    urgentAttention ? `${plural(urgentAttention, "thing")} ${urgentAttention === 1 ? "needs" : "need"} your attention` : "Nothing needs your attention",
  ].join(" · ");

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[15px] font-medium text-ink-3">{formatLongDate(today)}</p>
          <h1 className="mt-0.5 text-[30px] font-semibold leading-tight tracking-tight md:text-[34px]">
            {greetingFor(now.getHours())}, {state.user.name}
          </h1>
          <p className="mt-1.5 text-[15.5px] text-ink-2">{summary}</p>
        </div>
        <button
          type="button"
          onClick={() => open({ type: "brief" })}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line-strong bg-surface px-3.5 text-[14.5px] font-medium text-ink-2 hover:text-ink"
        >
          <Sunrise size={17} aria-hidden />
          Morning Brief
        </button>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12">
        <div className="space-y-10">
          <section aria-labelledby="priorities">
            <SectionHeader id="priorities" title="Your priorities" />
            {priorities.length ? (
              <ol className="space-y-3">
                {priorities.map((loop, i) => (
                  <PriorityCard key={loop.id} loop={loop} index={i} />
                ))}
              </ol>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card">
                <CheckCircle2 className="text-success" size={22} aria-hidden />
                <div>
                  <p className="font-semibold">You&apos;re caught up.</p>
                  <p className="text-[15px] text-ink-2">Nothing urgent right now. ORBIT will let you know if that changes.</p>
                </div>
              </div>
            )}
            <Link href="/loops" className="mt-3 inline-flex min-h-9 items-center gap-1 rounded-lg px-1 text-[14.5px] font-medium text-ink-2 hover:text-ink">
              All open loops <ArrowRight size={15} aria-hidden />
            </Link>
          </section>

          {freeTime[0] && (
            <section aria-label="Free time suggestion">
              <FreeTimeCard suggestion={freeTime[0]} />
            </section>
          )}

          {attention.length > 0 && (
            <section aria-labelledby="attention">
              <SectionHeader id="attention" title="Needs your attention" />
              <NeedsAttention items={attention} />
            </section>
          )}

          {needsReply.length > 0 && (
            <section aria-labelledby="needs-reply">
              <SectionHeader id="needs-reply" title="Needs reply" />
              <ul className="space-y-3">
                {needsReply.slice(0, 3).map(({ message, loop }) => (
                  <NeedsReplyCard key={message.id} message={message} loop={loop} />
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-10">
          <section aria-labelledby="your-day">
            <SectionHeader
              id="your-day"
              title="Your day"
              action={
                <Link href={`/calendar?view=day&date=${today}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-1 text-[14.5px] font-medium text-accent hover:text-accent-strong">
                  Plan day <ArrowRight size={15} aria-hidden />
                </Link>
              }
            />
            <Timeline items={todayItems} date={today} />
          </section>
          <ComingUp groups={comingUp} />
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatDate } from "@/lib/domain/dates";
import { money } from "@/lib/domain/format";
import type { DateOnly } from "@/lib/domain/types";
import { eventsOn, weekOf, type CalendarEvent } from "@/lib/intelligence/calendar";
import { kindMeta, type Priority } from "@/lib/intelligence/priorities";
import { eventTone, eventToneLabel, type EventTone } from "@/lib/intelligence/today";
import { useSessionState } from "@/lib/hooks/useSessionState";
import { retailerOf } from "@/lib/store/selectors";
import type { OrbitData } from "@/lib/store/state";
import { IconButton } from "../ui/button";
import { cn } from "../ui/cn";

export const EV_DOT: Record<EventTone, string> = {
  return: "bg-ev-return",
  dropoff: "bg-ev-dropoff",
  delivery: "bg-ev-delivery",
  refund: "bg-ev-refund",
  credit: "bg-ev-credit",
};

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const MONTH = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });
const LONG = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
const SHORT_DAY = new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" });
export const utc = (d: DateOnly) => new Date(`${d}T12:00:00Z`);

/** One event as a compact agenda line: date, colored type marker, store and what happens, amount. */
export function AgendaRow({ e, data, today, showDate = true }: { e: CalendarEvent; data: OrbitData; today: DateOnly; showDate?: boolean }) {
  const tone = eventTone(e.kind);
  const near = e.date === today ? "Today" : e.date === addDays(today, 1) ? "Tmrw" : null;
  return (
    <li>
      <Link href={e.href} className="flex min-h-[56px] items-center gap-3 py-2 hover:bg-ivory-deep/60 sm:rounded-xl sm:px-2">
        {showDate && (
          <span className="w-11 shrink-0 text-center leading-tight">
            <span className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">{near ?? WEEKDAY.format(utc(e.date))}</span>
            <span className="tabular block text-[18px] font-bold">{Number(e.date.slice(8))}</span>
          </span>
        )}
        <span aria-hidden className={cn("h-9 w-1 shrink-0 rounded-full", EV_DOT[tone], e.certainty === "estimated" && "opacity-55")} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{e.title}</span>
          <span className="block truncate text-[13px] text-muted">
            {retailerOf(data, e.retailerId).name} · {e.label}
            {e.certainty === "estimated" ? " (estimated)" : ""}
          </span>
        </span>
        {e.amount != null && <span className="tabular shrink-0 text-[15px] font-semibold">{money(e.amount)}</span>}
        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted/60" />
      </Link>
    </li>
  );
}

/** Seven-day strip with typed markers. Today is ringed; the selected day is filled. */
export function WeekStrip({ events, today, data, title = "This week" }: { events: CalendarEvent[]; today: DateOnly; data: OrbitData; title?: string }) {
  const [selected, setSelected] = useSessionState<DateOnly>("calendar-day", today);
  const week = weekOf(selected);
  const dayEvents = eventsOn(events, selected);
  const next = events.find((e) => e.date > selected && e.deadline);

  return (
    <section aria-labelledby="week-title">
      <div className="mb-2 flex items-center gap-1">
        <h2 id="week-title" className="font-display flex-1 text-[22px] leading-none">
          {week[0] <= today && today <= week[6] ? title : `Week of ${formatDate(week[0], today)}`} <span className="font-sans text-[14px] font-medium tracking-normal text-muted">{MONTH.format(utc(week[3]))}</span>
        </h2>
        {selected !== today && (
          <button type="button" onClick={() => setSelected(today)} className="min-h-11 rounded-full px-3 text-[14px] font-semibold hover:bg-ivory-deep">
            Today
          </button>
        )}
        <IconButton label="Previous week" onClick={() => setSelected(addDays(selected, -7))}>
          <ChevronLeft aria-hidden className="size-5" />
        </IconButton>
        <IconButton label="Next week" onClick={() => setSelected(addDays(selected, 7))} className="-mr-2">
          <ChevronRight aria-hidden className="size-5" />
        </IconButton>
      </div>

      <div role="group" aria-label="Choose a day" className="grid grid-cols-7 gap-1 rounded-[22px] bg-card p-1.5 shadow-[var(--shadow-card)]">
        {week.map((d) => {
          const evs = eventsOn(events, d);
          const sel = d === selected;
          const isToday = d === today;
          const tones = [...new Set(evs.map((e) => eventTone(e.kind)))];
          return (
            <button
              key={d}
              type="button"
              aria-pressed={sel}
              aria-label={`${LONG.format(utc(d))}${isToday ? ", today" : ""}: ${evs.length ? evs.map((e) => e.label).join(", ") : "nothing scheduled"}`}
              onClick={() => setSelected(d)}
              className={cn(
                "relative flex min-h-[70px] flex-col items-center rounded-[16px] pb-2 pt-2 transition-colors",
                sel ? "bg-navy text-white" : "hover:bg-ivory-deep",
                isToday && !sel && "ring-2 ring-inset ring-navy",
              )}
            >
              <span className={cn("text-[11px] font-semibold uppercase tracking-[0.06em]", sel ? "text-white/70" : "text-muted")}>{WEEKDAY.format(utc(d))}</span>
              <span className="tabular text-[19px] font-bold leading-tight">{Number(d.slice(8))}</span>
              <span className="mt-auto flex h-2 items-center gap-[3px]">
                {tones.slice(0, 3).map((t) => (
                  <span key={t} className={cn("size-[7px] rounded-full", EV_DOT[t], sel && "ring-1 ring-white")} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[12px] text-muted" aria-hidden>
        {(Object.keys(EV_DOT) as EventTone[]).map((t) => (
          <span key={t} className="inline-flex items-center gap-1">
            <span className={cn("size-2 rounded-full", EV_DOT[t])} />
            {eventToneLabel[t]}
          </span>
        ))}
      </div>

      <div aria-live="polite" className="mt-3">
        {dayEvents.length > 0 ? (
          <>
            <p className="px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">{selected === today ? "Today" : LONG.format(utc(selected))}</p>
            <ul className="divide-y divide-line">
              {dayEvents.map((e) => (
                <AgendaRow key={e.id} e={e} data={data} today={today} showDate={false} />
              ))}
            </ul>
          </>
        ) : (
          <p className="flex min-h-11 flex-wrap items-center justify-between gap-2 px-1 text-[14px] text-muted">
            <span>Nothing on {selected === today ? "today" : SHORT_DAY.format(utc(selected))}.</span>
            {next && (
              <button type="button" onClick={() => setSelected(next.date)} className="inline-flex min-h-11 items-center gap-1 font-semibold text-navy">
                Next: {formatDate(next.date, today)} <ArrowRight aria-hidden className="size-4" />
              </button>
            )}
          </p>
        )}
      </div>
      <Link href="/calendar/" className="mt-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-[14px] font-semibold text-navy">
        <CalendarRange aria-hidden className="size-4" /> Full calendar
      </Link>
    </section>
  );
}

/** The one thing to do next, art-directed: plum card, geometric accents, one action. */
export function NextUpCard({ p, data, today }: { p: Priority; data: OrbitData; today: DateOnly }) {
  const retailer = retailerOf(data, p.retailerId);
  const late = p.daysLeft != null && p.daysLeft < 0 ? `${-p.daysLeft} ${p.daysLeft === -1 ? "day" : "days"}` : null;
  const when = p.daysLeft == null ? "Now" : late ? (p.kind === "refund_check" ? `Expected ${late} ago` : `${late} late`) : p.daysLeft === 0 ? "Today" : p.daysLeft === 1 ? "Tomorrow" : `In ${p.daysLeft} days`;
  const urgent = p.daysLeft != null && p.daysLeft <= 3;
  return (
    <article className="relative overflow-hidden rounded-[28px] bg-navy p-5 text-white shadow-[var(--shadow-lift)]">
      <span aria-hidden className={cn("absolute -right-8 -top-10 size-36 rounded-full", urgent ? "bg-returns" : "bg-[#3d3660]")} />
      <span aria-hidden className="absolute -bottom-8 right-16 size-20 rotate-[18deg] rounded-[22px] bg-circle-soft/90" />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[13px] font-semibold">
          Next up · {when}
          {p.estimated && p.dueDate && p.kind !== "refund_check" ? " (est.)" : ""}
        </span>
        <Link href={p.detailHref} className="mt-3 block max-w-[260px]">
          <span className="font-display block text-[25px] leading-[1.05]">{headline(p, retailer.name)}</span>
          <span className="mt-1.5 block text-[14px] text-white/75">
            {p.kind === "refund_check" ? p.title : retailer.name || kindMeta[p.kind].label}
            {p.dueDate ? ` · ${kindMeta[p.kind].due} ${formatDate(p.dueDate, today)}` : ""}
            {p.amount != null ? ` · ${money(p.amount)}` : ""}
          </span>
        </Link>
        <Link href={p.action.href} className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-5 text-[15px] font-bold text-navy transition-transform active:scale-[0.98]">
          {p.action.label} <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
    </article>
  );
}

/** Plain-language question for the hero. */
function headline(p: Priority, store: string): string {
  switch (p.kind) {
    case "return_deadline":
      return `Keep or return the ${p.title}?`;
    case "drop_off":
      return `Drop off the ${p.title}`;
    case "finish_return":
      return `Finish returning the ${p.title}`;
    case "refund_check":
      return `Check on your ${store} refund`;
    case "refund_arrival":
      return "Did your refund arrive?";
    case "refund_missing":
      return "Follow up on a missing refund";
    case "credit_expiring":
      return `Use your ${p.title.toLowerCase()} before it expires`;
    case "missing_info":
      return `Add details for the ${p.title}`;
    default:
      return p.title;
  }
}

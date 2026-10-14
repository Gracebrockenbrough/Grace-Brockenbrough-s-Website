import type { OrbitState } from "@/store/state";
import type { OrbitDerived } from "./orbitEngine";
import { areaLabel } from "@/lib/areas";
import { formatTime, relativeDateTime, relativeDay } from "@/lib/time";

/**
 * A compact, plain-text picture of the person's week for Orbit's AI. Only
 * what's needed to answer: open loops, the next seven days, goals, changes.
 */
export function lifeSnapshot(state: OrbitState, d: OrbitDerived): string {
  const lines: string[] = [];
  lines.push(`Now: ${d.now.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}`);
  if (state.user.name) lines.push(`Name: ${state.user.name}`);
  if (state.profile.lives.length) lines.push(`Their life: ${state.profile.lives.join(", ")}`);
  lines.push(`How involved Orbit should be: ${state.profile.involvement}`);

  lines.push("", "Open loops (most important first):");
  if (!d.openLoops.length) lines.push("- none");
  for (const l of d.openLoops.slice(0, 25)) {
    const parts = [areaLabel(l.category)];
    if (l.deadline) parts.push(`due ${relativeDateTime(l.deadline, d.today)}`);
    if (l.waitingOn) parts.push(`waiting on ${l.waitingOn}`);
    if (l.effortMinutes) parts.push(`~${l.effortMinutes} min`);
    lines.push(`- ${l.title} (${parts.join(", ")})`);
  }

  lines.push("", "Calendar, next 7 days:");
  const items = d.upcomingItems.filter((i) => i.kind !== "deadline").slice(0, 40);
  if (!items.length) lines.push("- nothing scheduled");
  for (const i of items) lines.push(`- ${relativeDay(i.date, d.today)}${i.startTime ? ` ${formatTime(i.startTime)}${i.endTime ? `–${formatTime(i.endTime)}` : ""}` : ""}: ${i.title}`);

  if (d.freeTime.length) {
    lines.push("", "Open time today:");
    for (const f of d.freeTime) lines.push(`- ${formatTime(f.start)}–${formatTime(f.end)}`);
  }
  if (d.goals.length) {
    lines.push("", "Goals:");
    for (const { goal, progress } of d.goals)
      lines.push(`- ${goal.title}: ${progress.done}/${progress.total} steps, next "${progress.next?.title ?? "none"}"${progress.next ? ` ${relativeDay(progress.next.date, d.today)}` : ""}, target ${goal.target}`);
  }
  if (d.changes.length) {
    lines.push("", "Recent changes Orbit noticed:");
    for (const c of d.changes) lines.push(`- ${c.title} moved (${c.impact ?? "not yet applied"})`);
  }
  return lines.join("\n");
}

export const ORBIT_VOICE = `You are Orbit, a calm personal assistant inside a phone app. Answer the person's question using only the information below about their life.
Rules:
- Be brief: two to five short sentences, or a short list. Plain language, no headings, no emoji.
- Be specific: use their real items, days and times.
- End with one concrete next step they can take in Orbit (for example: block time, check something off, draft a message).
- You cannot send messages, change their calendar, buy, submit, or cancel anything. Never say you did. You can suggest.
- If the information isn't there, say so in one line and suggest what to add with the + button.`;

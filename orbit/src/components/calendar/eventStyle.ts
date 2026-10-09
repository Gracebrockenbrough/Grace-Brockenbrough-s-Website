import { BookOpen, Coffee, Flag, GraduationCap, NotebookPen, PartyPopper, Plane, Stethoscope, Users } from "lucide-react";
import type { EventCategory } from "@/types";

/**
 * One calendar color system, used in Day, Week, Month, Today, and course pages.
 *   Academic (indigo) · Meetings (teal) · Personal (neutral) · Social (coral)
 *   Deadlines (amber) · Conflicts (red ring, only when something is wrong)
 * Every block also carries text, so color is never the only signal.
 */
export const EVENT_META: Record<EventCategory, { label: string; icon: typeof BookOpen; block: string; chip: string; dot: string }> = {
  class: { label: "Class", icon: BookOpen, block: "bg-academic-soft text-academic-ink border-academic", chip: "bg-academic-soft text-academic-ink", dot: "bg-academic" },
  exam: { label: "Exam", icon: GraduationCap, block: "bg-academic text-white border-academic-ink", chip: "bg-academic text-white", dot: "bg-academic-ink" },
  study: { label: "Study", icon: NotebookPen, block: "bg-surface text-academic-ink border-academic border-dashed", chip: "bg-academic-soft text-academic-ink", dot: "bg-academic" },
  meeting: { label: "Meeting", icon: Users, block: "bg-meet-soft text-meet-ink border-meet", chip: "bg-meet-soft text-meet-ink", dot: "bg-meet" },
  appointment: { label: "Appointment", icon: Stethoscope, block: "bg-meet-soft text-meet-ink border-meet", chip: "bg-meet-soft text-meet-ink", dot: "bg-meet" },
  personal: { label: "Personal", icon: Coffee, block: "bg-personal-soft text-personal-ink border-personal", chip: "bg-personal-soft text-personal-ink", dot: "bg-personal" },
  travel: { label: "Travel", icon: Plane, block: "bg-personal-soft text-personal-ink border-personal", chip: "bg-personal-soft text-personal-ink", dot: "bg-personal" },
  social: { label: "Social", icon: PartyPopper, block: "bg-social-soft text-social-ink border-social", chip: "bg-social-soft text-social-ink", dot: "bg-social" },
  deadline: { label: "Due", icon: Flag, block: "bg-due-soft text-due-ink border-due", chip: "bg-due-soft text-due-ink", dot: "bg-due" },
};

export const LEGEND: { label: string; dot: string }[] = [
  { label: "Classes", dot: "bg-academic" },
  { label: "Meetings", dot: "bg-meet" },
  { label: "Personal", dot: "bg-personal" },
  { label: "Social", dot: "bg-social" },
  { label: "Due", dot: "bg-due" },
];

import { BookOpen, CalendarDays, CircleDot, MessageSquareText, Orbit, Sun } from "lucide-react";

/** Four destinations plus Add in the middle. Tasks and Courses live inside the planets. */
export const NAV_ITEMS = [
  { href: "/today", label: "Today", short: "Today", icon: Sun },
  { href: "/orbit", label: "Orbit", short: "Orbit", icon: Orbit },
  { href: "/calendar", label: "Calendar", short: "Calendar", icon: CalendarDays },
  { href: "/ask", label: "Ask ORBIT", short: "Ask", icon: MessageSquareText },
] as const;

export const MORE_ITEMS = [
  { href: "/loops", label: "All tasks", icon: CircleDot },
  { href: "/courses", label: "Courses", icon: BookOpen },
] as const;

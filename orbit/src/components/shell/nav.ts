import { CalendarDays, MessageCircle, Orbit, Sun } from "lucide-react";

/** Four destinations plus Add in the middle. Open Loops and life modules live inside Today and Orbit. */
export const NAV_ITEMS = [
  { href: "/today", label: "Today", short: "Today", icon: Sun },
  { href: "/orbit", label: "Orbit", short: "Orbit", icon: Orbit },
  { href: "/calendar", label: "Calendar", short: "Calendar", icon: CalendarDays },
  { href: "/ask", label: "Ask Orbit", short: "Ask", icon: MessageCircle },
] as const;

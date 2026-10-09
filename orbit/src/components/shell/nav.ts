import { BookOpen, CalendarDays, CircleDot, MessageSquareText, Sun } from "lucide-react";

/** Five destinations. Capture is a persistent button, not a sixth tab. */
export const NAV_ITEMS = [
  { href: "/today", label: "Today", short: "Today", icon: Sun },
  { href: "/calendar", label: "Calendar", short: "Calendar", icon: CalendarDays },
  { href: "/courses", label: "Courses", short: "Courses", icon: BookOpen },
  { href: "/loops", label: "Tasks", short: "Tasks", icon: CircleDot },
  { href: "/ask", label: "Ask ORBIT", short: "Ask", icon: MessageSquareText },
] as const;

import type { CalendarEvent } from "@/types";

const gcal = { kind: "calendar" as const, label: "Google Calendar" };

/**
 * Non-class calendar events. Class meetings are generated from each course's
 * schedule; exams and deadlines come from course data.
 */
export const mockEvents: CalendarEvent[] = [
  // Friday, Oct 9 — today
  { id: "ev-lunch", title: "Lunch with Maya", date: "2026-10-09", startTime: "12:00", endTime: "12:45", category: "personal", source: gcal, location: "Marketplace", hardCommitment: false, confidence: 1 },
  { id: "ev-ai-meeting", title: "AI Project Meeting", date: "2026-10-09", startTime: "13:30", endTime: "14:30", category: "meeting", source: gcal, location: "Leyburn Library, Room 2", hardCommitment: true, confidence: 1, courseId: "bus304" },
  { id: "ev-gym", title: "Gym", date: "2026-10-09", startTime: "16:30", endTime: "17:30", category: "personal", source: gcal, location: "Doremus Gym", hardCommitment: false, confidence: 1 },
  { id: "ev-dinner", title: "Dinner with roommates", date: "2026-10-09", startTime: "18:30", endTime: "19:30", category: "social", source: gcal, location: "Southern Inn", hardCommitment: false, confidence: 1 },

  // Weekend
  { id: "ev-football", title: "Football vs. Sewanee", date: "2026-10-10", startTime: "13:00", endTime: "16:00", category: "social", source: gcal, location: "Wilson Field", hardCommitment: false, confidence: 1 },
  { id: "ev-brunch", title: "Brunch with Ava", date: "2026-10-11", startTime: "11:00", endTime: "12:00", category: "social", source: gcal, location: "Pronto", hardCommitment: false, confidence: 1 },

  // Tuesday, Oct 13 — the conflict demo
  { id: "ev-fin-review", title: "Finance review session", date: "2026-10-13", startTime: "14:00", endTime: "15:00", category: "study", source: { kind: "canvas", label: "FIN 359 Canvas announcement" }, location: "Huntley 327", hardCommitment: false, confidence: 0.95, courseId: "fin359" },
  { id: "ev-advising", title: "Advising appointment", date: "2026-10-13", startTime: "14:30", endTime: "15:00", category: "appointment", source: { kind: "email", label: "Advising Office email", ref: "m-advising" }, location: "Elrod Commons 214", hardCommitment: true, confidence: 1 },

  // Later
  { id: "ev-club", title: "Finance Club meeting", date: "2026-10-14", startTime: "19:00", endTime: "20:00", category: "social", source: gcal, location: "Huntley 106", hardCommitment: false, confidence: 1 },
  { id: "ev-career-fair", title: "Fall Career Fair", date: "2026-10-21", startTime: "12:00", endTime: "15:00", category: "meeting", source: gcal, location: "Doremus Gym", hardCommitment: false, confidence: 1, major: true },
  { id: "ev-family-weekend", title: "Family Weekend", date: "2026-10-30", endDate: "2026-11-01", category: "personal", source: gcal, hardCommitment: false, confidence: 1, major: true },
  { id: "ev-flight-home", title: "Flight home for Thanksgiving", date: "2026-11-24", startTime: "15:20", endTime: "17:45", category: "travel", source: gcal, location: "ROA → BOS", hardCommitment: true, confidence: 1, major: true },
];

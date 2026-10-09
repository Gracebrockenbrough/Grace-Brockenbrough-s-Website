import type { SyllabusExtraction } from "@/types";

/**
 * What ORBIT "reads" from the sample ARTH 202 syllabus. In production this
 * would come from a document model; the review flow is identical.
 * 18 dates: 11 assignments, 2 exams, 1 presentation, 4 milestones.
 */
export const sampleSyllabusExtraction: SyllabusExtraction = {
  courseId: "arth202",
  courseGuess: "ARTH 202 · Modern Art History",
  fileName: "ARTH202_Modern_Art_Syllabus_Fall2026.pdf",
  pages: 8,
  officeHours: "Tuesday · 1:00–2:30 PM · Wilson Hall 210",
  items: [
    { id: "s1", kind: "assignment", title: "Reading response 3", date: "2026-10-13", time: "16:00", effort: "small", confidence: 0.95, quote: "Response 3 — due in class Tue 10/13" },
    { id: "s2", kind: "assignment", title: "Visual analysis paper", date: "2026-10-16", time: "23:59", effort: "large", confidence: 0.96, quote: "Visual Analysis Paper (1,200 words) due Friday, October 16" },
    { id: "s3", kind: "exam", title: "ARTH 202 Midterm", date: "2026-10-22", time: "16:00", effort: "large", confidence: 0.97, quote: "Midterm Exam — Thursday, October 22, in class" },
    { id: "s4", kind: "assignment", title: "Reading response 4", date: "2026-10-27", time: "16:00", effort: "small", confidence: 0.94, quote: "Response 4 — Tue 10/27" },
    { id: "s5", kind: "milestone", title: "Museum field trip — VMFA", date: "2026-10-31", effort: "small", confidence: 0.9, quote: "Saturday field trip to the Virginia Museum of Fine Arts (Oct 31)" },
    { id: "s6", kind: "assignment", title: "Museum visit reflection", date: "2026-11-05", time: "16:00", effort: "medium", confidence: 0.92, quote: "Museum reflection due the Thursday after the field trip" },
    { id: "s7", kind: "assignment", title: "Reading response 5", date: "2026-11-03", time: "16:00", effort: "small", confidence: 0.78, note: "The syllabus says “week of Nov 2.” I picked Tuesday, the first class that week.", quote: "Response 5 — week of Nov 2" },
    { id: "s8", kind: "assignment", title: "Research paper proposal", date: "2026-11-06", time: "23:59", effort: "medium", confidence: 0.95, quote: "Research proposal (1 page) due Nov 6" },
    { id: "s9", kind: "milestone", title: "Last day to drop with a W", date: "2026-11-06", effort: "small", confidence: 0.93, quote: "Last day to withdraw: November 6" },
    { id: "s10", kind: "assignment", title: "Reading response 6", date: "2026-11-10", time: "16:00", effort: "small", confidence: 0.94, quote: "Response 6 — Tue 11/10" },
    { id: "s11", kind: "assignment", title: "Annotated bibliography", date: "2026-11-13", time: "23:59", effort: "medium", confidence: 0.95, quote: "Annotated bibliography (8 sources) — Nov 13" },
    { id: "s12", kind: "presentation", title: "Research presentation", effort: "medium", confidence: 0.35, note: "I found this in the syllabus, but the date isn't completely clear. It says “late November, schedule TBA.”", quote: "Research presentations — late November (schedule TBA)" },
    { id: "s13", kind: "milestone", title: "Paper workshop", date: "2026-11-19", time: "16:00", effort: "small", confidence: 0.9, quote: "Peer paper workshop — Thursday 11/19, bring a full draft" },
    { id: "s14", kind: "assignment", title: "Reading response 7", date: "2026-11-17", time: "16:00", effort: "small", confidence: 0.93, quote: "Response 7 — Tue 11/17" },
    { id: "s15", kind: "milestone", title: "Thanksgiving break — no class", date: "2026-11-26", effort: "small", confidence: 0.99, quote: "No class Nov 26 — Thanksgiving" },
    { id: "s16", kind: "assignment", title: "Final research paper", date: "2026-12-04", time: "23:59", effort: "large", confidence: 0.96, quote: "Final research paper (3,000 words) due December 4" },
    { id: "s17", kind: "assignment", title: "Reading response 8", date: "2026-12-01", time: "16:00", effort: "small", confidence: 0.6, note: "I'm not completely sure whether this is due Tuesday or Thursday that week.", quote: "Response 8 — first week of December" },
    { id: "s18", kind: "exam", title: "ARTH 202 Final exam", date: "2026-12-11", time: "09:00", effort: "large", confidence: 0.94, quote: "Final Exam — Friday, Dec 11, 9:00 AM" },
  ],
};

export const SYLLABUS_PROCESSING_STEPS = [
  "Reading your syllabus…",
  "Finding the course and professor…",
  "Finding assignments…",
  "Checking exam dates…",
  "Comparing with your calendar…",
];

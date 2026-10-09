import type { Assignment, Course, CourseDocument, CourseMilestone, Exam } from "@/types";

export const mockCourses: Course[] = [
  {
    id: "acct311",
    code: "ACCT 311",
    name: "Managerial Accounting",
    professor: "Professor Linda Hayes",
    professorEmail: "hayesl@demo.edu",
    officeHours: "Tuesday & Thursday · 3:00–4:30 PM · Huntley 214",
    meetingDays: [1, 3, 5],
    startTime: "08:30",
    endTime: "09:45",
    location: "Huntley 220",
    color: "teal",
    syllabusDocumentId: "doc-acct-syllabus",
  },
  {
    id: "fin359",
    code: "FIN 359",
    name: "Investment Management",
    professor: "Professor Daniel Reyes",
    professorEmail: "reyesd@demo.edu",
    officeHours: "Monday · 1:00–3:00 PM · Huntley 331",
    meetingDays: [1, 3, 5],
    startTime: "10:00",
    endTime: "11:15",
    location: "Huntley 327",
    color: "indigo",
    syllabusDocumentId: "doc-fin-syllabus",
  },
  {
    id: "bus304",
    code: "BUS 304",
    name: "AI and Business",
    professor: "Professor Ellen Martin",
    professorEmail: "martine@demo.edu",
    officeHours: "Wednesday · 10:00 AM–12:00 PM · Huntley 108",
    meetingDays: [2, 4],
    startTime: "11:30",
    endTime: "12:45",
    location: "Huntley 105",
    color: "amber",
    syllabusDocumentId: "doc-bus-syllabus",
  },
  {
    id: "arth202",
    code: "ARTH 202",
    name: "Modern Art History",
    professor: "Professor Samuel Okafor",
    professorEmail: "okafors@demo.edu",
    officeHours: "Not listed yet",
    meetingDays: [2, 4],
    startTime: "16:00",
    endTime: "17:15",
    location: "Wilson Hall 104",
    color: "rose",
  },
];

const syllabus = (code: string, ref: string) => ({ kind: "syllabus" as const, label: `${code} syllabus`, ref });

export const mockAssignments: Assignment[] = [
  // ACCT 311
  { id: "a-acct-ps4", courseId: "acct311", title: "Problem Set 4", type: "problem_set", due: "2026-10-02T23:59", effort: "medium", completed: true, source: syllabus("ACCT 311", "doc-acct-syllabus"), confidence: 0.97 },
  { id: "a-acct-ps5", courseId: "acct311", title: "Problem Set 5", type: "problem_set", due: "2026-10-16T23:59", effort: "medium", completed: false, source: syllabus("ACCT 311", "doc-acct-syllabus"), confidence: 0.96 },
  { id: "a-acct-case", courseId: "acct311", title: "Cost allocation case", type: "project", due: "2026-11-06T23:59", effort: "large", completed: false, source: syllabus("ACCT 311", "doc-acct-syllabus"), confidence: 0.94 },

  // FIN 359
  { id: "a-fin-ps2", courseId: "fin359", title: "Problem Set 2", type: "problem_set", due: "2026-09-25T17:00", effort: "medium", completed: true, source: syllabus("FIN 359", "doc-fin-syllabus"), confidence: 0.98 },
  { id: "a-fin-ps3", courseId: "fin359", title: "Finance problem set", type: "problem_set", due: "2026-10-09T17:00", effort: "medium", completed: false, source: syllabus("FIN 359", "doc-fin-syllabus"), confidence: 0.98, note: "Problem Set 3 · Questions 1–10 · Submit on Canvas" },
  { id: "a-fin-memo", courseId: "fin359", title: "Portfolio memo", type: "paper", due: "2026-10-23T23:59", effort: "large", completed: false, source: syllabus("FIN 359", "doc-fin-syllabus"), confidence: 0.95 },

  // BUS 304
  { id: "a-bus-case", courseId: "bus304", title: "Case write-up: AI at Zillow", type: "paper", due: "2026-10-13T23:59", effort: "medium", completed: false, source: syllabus("BUS 304", "doc-bus-syllabus"), confidence: 0.93 },
  { id: "a-bus-orbit", courseId: "bus304", title: "ORBIT Prototype", type: "project", due: "2026-10-16T11:30", effort: "large", completed: false, source: syllabus("BUS 304", "doc-bus-syllabus"), confidence: 0.97, note: "Team project · present in class" },
  { id: "a-bus-final", courseId: "bus304", title: "Final presentation", type: "presentation", due: "2026-12-03T11:30", effort: "large", completed: false, source: syllabus("BUS 304", "doc-bus-syllabus"), confidence: 0.92 },
];

export const mockExams: Exam[] = [
  { id: "e-acct-1", courseId: "acct311", title: "ACCT 311 Exam 1", date: "2026-10-12", startTime: "08:30", endTime: "09:45", location: "Huntley 220", source: syllabus("ACCT 311", "doc-acct-syllabus"), confidence: 0.97 },
  { id: "e-acct-2", courseId: "acct311", title: "ACCT 311 Exam 2", location: "Huntley 220", source: syllabus("ACCT 311", "doc-acct-syllabus"), confidence: 0.4 },
  { id: "e-fin-mid", courseId: "fin359", title: "FIN 359 Midterm", date: "2026-10-15", startTime: "10:00", endTime: "11:30", location: "Huntley 327", source: syllabus("FIN 359", "doc-fin-syllabus"), confidence: 0.96 },
  { id: "e-fin-final", courseId: "fin359", title: "FIN 359 Final", date: "2026-12-10", startTime: "09:00", endTime: "12:00", location: "Huntley 327", source: syllabus("FIN 359", "doc-fin-syllabus"), confidence: 0.93 },
  { id: "e-acct-final", courseId: "acct311", title: "ACCT 311 Final", date: "2026-12-09", startTime: "14:00", endTime: "17:00", location: "Huntley 220", source: syllabus("ACCT 311", "doc-acct-syllabus"), confidence: 0.92 },
];

export const mockMilestones: CourseMilestone[] = [
  { id: "ms-reading-days", courseId: "acct311", title: "Reading days — no classes", date: "2026-10-19", source: { kind: "calendar", label: "Academic calendar" }, confidence: 0.99 },
  { id: "ms-fin-drop", courseId: "fin359", title: "Last day to drop with a W", date: "2026-10-23", source: syllabus("FIN 359", "doc-fin-syllabus"), confidence: 0.95 },
  { id: "ms-bus-teams", courseId: "bus304", title: "Project teams finalized", date: "2026-09-18", source: syllabus("BUS 304", "doc-bus-syllabus"), confidence: 0.95 },
];

export const mockDocuments: CourseDocument[] = [
  { id: "doc-acct-syllabus", courseId: "acct311", name: "ACCT311_Syllabus_Fall2026.pdf", kind: "syllabus", addedAt: "2026-09-02", pages: 9 },
  { id: "doc-fin-syllabus", courseId: "fin359", name: "FIN 359 Syllabus.pdf", kind: "syllabus", addedAt: "2026-09-02", pages: 7 },
  { id: "doc-bus-syllabus", courseId: "bus304", name: "BUS304 AI and Business — Syllabus.pdf", kind: "syllabus", addedAt: "2026-09-03", pages: 6 },
  { id: "doc-bus-rubric", courseId: "bus304", name: "ORBIT prototype rubric.pdf", kind: "other", addedAt: "2026-09-29", pages: 2 },
];

/** Academic breaks — no class meetings are generated on these dates. */
export const noClassDates = ["2026-10-19", "2026-10-20", "2026-11-25", "2026-11-26", "2026-11-27"];

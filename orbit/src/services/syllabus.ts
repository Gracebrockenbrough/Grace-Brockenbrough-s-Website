import type { Assignment, Course, CourseDocument, CourseMilestone, Exam, SyllabusExtraction, SyllabusItem } from "@/types";
import { sampleSyllabusExtraction } from "@/data/mockSyllabus";
import { addMinutesToTime } from "@/lib/time";

export type SyllabusReadResult =
  | { ok: true; extraction: SyllabusExtraction }
  | { ok: false; reason: "unsupported" | "unreadable"; message: string };

const SUPPORTED = /\.(pdf|png|jpe?g|heic|webp|docx?)$/i;

/**
 * Simulated syllabus reader. Any supported file returns the sample ARTH 202
 * extraction so the review flow can be demonstrated end to end; a real
 * implementation would send the document to a model.
 */
export function readSyllabus(file: { name: string; size: number; type?: string }, courses: Course[], targetCourseId?: string): SyllabusReadResult {
  if (!SUPPORTED.test(file.name) && !(file.type ?? "").startsWith("image/")) {
    return { ok: false, reason: "unsupported", message: "ORBIT can read PDFs, Word documents, and photos of a syllabus. This file type isn't one of them." };
  }
  if (file.size === 0 || /blurry|scan_unreadable/i.test(file.name)) {
    return { ok: false, reason: "unreadable", message: "I couldn't fully read this syllabus. You can try another copy or take a clearer photo." };
  }
  const course = courses.find((c) => c.id === targetCourseId) ?? courses.find((c) => c.id === sampleSyllabusExtraction.courseId)!;
  return {
    ok: true,
    extraction: {
      ...sampleSyllabusExtraction,
      courseId: course.id,
      courseGuess: `${course.code} · ${course.name}`,
      fileName: file.name,
      items: sampleSyllabusExtraction.items.map((i) => ({ ...i })),
    },
  };
}

export function summarizeExtraction(items: SyllabusItem[]): { label: string; count: number }[] {
  const count = (k: SyllabusItem["kind"]) => items.filter((i) => i.kind === k).length;
  return [
    { label: "assignments", count: count("assignment") },
    { label: "exams", count: count("exam") },
    { label: "presentation", count: count("presentation") },
    { label: "course milestones", count: count("milestone") },
  ]
    .filter((x) => x.count > 0)
    .map((x) => ({ ...x, label: x.count === 1 ? x.label.replace(/s$/, "") : x.label.endsWith("s") ? x.label : `${x.label}s` }));
}

/** Turn confirmed review items into course records. Undated items stay as "needs a date". */
export function toCourseRecords(
  extraction: SyllabusExtraction,
  confirmed: SyllabusItem[],
  addedAt: string,
): { document: CourseDocument; assignments: Assignment[]; exams: Exam[]; milestones: CourseMilestone[] } {
  const course = extraction.courseId;
  const source = { kind: "syllabus" as const, label: `${extraction.courseGuess.split(" · ")[0]} syllabus`, ref: `doc-${course}-syllabus` };
  const assignments: Assignment[] = [];
  const exams: Exam[] = [];
  const milestones: CourseMilestone[] = [];

  for (const item of confirmed) {
    const confidence = item.date ? Math.max(item.confidence, 0.85) : item.confidence;
    if (item.kind === "exam") {
      exams.push({
        id: `e-${course}-${item.id}`,
        courseId: course,
        title: item.title,
        date: item.date,
        startTime: item.time,
        endTime: item.time ? addMinutesToTime(item.time, item.title.includes("Final") ? 180 : 75) : undefined,
        source,
        confidence,
      });
    } else if (item.kind === "milestone") {
      milestones.push({ id: `ms-${course}-${item.id}`, courseId: course, title: item.title, date: item.date, source, confidence });
    } else {
      assignments.push({
        id: `a-${course}-${item.id}`,
        courseId: course,
        title: item.title,
        type: item.kind === "presentation" ? "presentation" : /paper|bibliograph|proposal|reflection/i.test(item.title) ? "paper" : /reading/i.test(item.title) ? "reading" : "assignment",
        due: item.date ? `${item.date}T${item.time ?? "23:59"}` : undefined,
        effort: item.effort,
        completed: false,
        source,
        confidence,
        note: item.note,
      });
    }
  }

  return {
    document: { id: source.ref, courseId: course, name: extraction.fileName, kind: "syllabus", addedAt, pages: extraction.pages },
    assignments,
    exams,
    milestones,
  };
}

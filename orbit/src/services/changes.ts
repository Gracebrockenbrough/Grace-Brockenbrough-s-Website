import type { Assignment, ConnectedSource, Course, DetectedChange, Exam, ExtractedFact } from "@/types";
import { hiddenKinds } from "./connections";
import { datePart, formatShortDate, formatTime, timePart } from "@/lib/time";

/**
 * Compare newly extracted facts with what ORBIT already knows. When a material
 * field (date/time) differs, create a DetectedChange. High-impact changes are
 * never applied silently — they always require approval.
 */
export function detectChanges(
  facts: ExtractedFact[],
  exams: Exam[],
  assignments: Assignment[],
  courses: Course[],
  sources: ConnectedSource[],
  status: Record<string, "applied" | "dismissed">,
): DetectedChange[] {
  const disabled = hiddenKinds(sources);
  const changes: DetectedChange[] = [];

  for (const fact of facts) {
    if (status[fact.id]) continue;
    if (disabled.has(fact.source.kind)) continue;

    if (fact.entityType === "exam") {
      const exam = exams.find((e) => e.id === fact.entityId);
      if (!exam) continue;
      if (exam.date === fact.value.date && exam.startTime === fact.value.startTime) continue;
      changes.push({
        id: fact.id,
        entityType: "exam",
        entityId: exam.id,
        title: exam.title,
        courseId: exam.courseId,
        previousValue: { date: exam.date, startTime: exam.startTime },
        newValue: fact.value,
        source: fact.source,
        quote: fact.quote,
        importance: "high",
        confidence: fact.confidence,
        requiresApproval: true,
      });
    } else {
      const assignment = assignments.find((a) => a.id === fact.entityId);
      if (!assignment) continue;
      const prevDate = assignment.due ? datePart(assignment.due) : undefined;
      const prevTime = assignment.due ? timePart(assignment.due) : undefined;
      if (prevDate === fact.value.date && prevTime === fact.value.startTime) continue;
      const course = courses.find((c) => c.id === assignment.courseId);
      changes.push({
        id: fact.id,
        entityType: "assignment",
        entityId: assignment.id,
        title: `${course?.code ?? ""} ${assignment.title}`.trim(),
        courseId: assignment.courseId,
        previousValue: { date: prevDate, startTime: prevTime },
        newValue: fact.value,
        source: fact.source,
        quote: fact.quote,
        importance: "medium",
        confidence: fact.confidence,
        requiresApproval: true,
      });
    }
  }
  return changes;
}

export function describeWhen(value: { date?: string; startTime?: string }): string {
  if (!value.date) return "No date";
  const time = value.startTime && value.startTime !== "23:59" ? ` · ${formatTime(value.startTime)}` : "";
  return `${formatShortDate(value.date)}${time}`;
}

export function confidenceLabel(confidence: number): "High confidence" | "I think this is correct" | "Needs review" {
  if (confidence >= 0.85) return "High confidence";
  if (confidence >= 0.6) return "I think this is correct";
  return "Needs review";
}

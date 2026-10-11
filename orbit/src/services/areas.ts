import type { CalendarItem, Category, Course, Goal, RankedLoop } from "@/types";
import { relativeDay } from "@/lib/time";
import { goalProgress, type GoalProgress, type StudyProgress } from "./goals";

/** Which part of life a calendar item belongs to. */
export function areaForItem(item: CalendarItem, loops: RankedLoop[]): Category {
  if (item.loopId) {
    const loop = loops.find((l) => l.id === item.loopId);
    if (loop) return loop.category;
  }
  if (item.courseId || item.prepForExamId) return "school";
  if (/advis|office hours|professor|study group/i.test(item.title)) return "school";
  switch (item.category) {
    case "class":
    case "exam":
    case "study":
      return "school";
    case "meeting":
      return /recruit|interview|career|coffee chat|analyst|internship/i.test(item.title) ? "career" : item.title.match(/advis|office hours|team|project/i) ? "school" : "work";
    case "appointment":
      return "health";
    case "travel":
      return "travel";
    case "social":
      return "social";
    case "deadline":
      return "school";
    default:
      return /run|gym|yoga|workout|walk|doctor|dentist|sleep|practice|swim|pilates|lift/i.test(item.title) ? "health" : "personal";
  }
}

export interface AreaSummary {
  area: Category;
  loops: RankedLoop[];
  items: CalendarItem[];
  goals: { goal: Goal; progress: GoalProgress }[];
  study: StudyProgress[];
  courses: Course[];
  /** Open tasks + goal steps due today. */
  count: number;
  /** Two or three words: "3 things", "On track", "2 upcoming", "Clear". */
  status: string;
  /** A slightly longer line for the area page, e.g. "ACCT exam Monday · 2 due today". */
  note: string;
  /** Something in this area needs attention soon. */
  hot: boolean;
}

export function summarizeAreas(input: {
  areas: Category[];
  loops: RankedLoop[];
  items: CalendarItem[];
  goals: Goal[];
  study: StudyProgress[];
  courses: Course[];
  today: string;
}): AreaSummary[] {
  const { today } = input;
  const weekEnd = new Date(`${today}T00:00`);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  return input.areas.map((area) => {
    const loops = input.loops.filter((l) => l.category === area && l.status !== "done");
    const items = input.items.filter((i) => i.date <= weekEndStr && areaForItem(i, input.loops) === area);
    const goals = input.goals.filter((g) => g.area === area).map((goal) => ({ goal, progress: goalProgress(goal, today) }));
    const study = area === "school" ? input.study : [];
    const courses = area === "school" ? input.courses : [];
    const dueToday = loops.filter((l) => l.deadline?.startsWith(today) || l.status === "now").length;
    const stepsToday = goals.filter((g) => g.progress.today && !g.progress.today.done).length;
    const overdue = loops.filter((l) => l.deadline && l.deadline.slice(0, 10) < today).length;

    const parts: string[] = [];
    const exam = items.find((i) => i.kind === "exam");
    if (exam) parts.push(`${exam.title.split(" ")[0]} exam ${(/^(Today|Tomorrow)$/.test(relativeDay(exam.date, today)) ? relativeDay(exam.date, today).toLowerCase() : relativeDay(exam.date, today))}`);
    if (overdue) parts.push(`${overdue} overdue`);
    else if (dueToday) parts.push(`${dueToday} due today`);
    const nextGoal = goals.find((g) => g.progress.next);
    if (nextGoal && parts.length < 2) parts.push(`${nextGoal.progress.done}/${nextGoal.progress.total} toward ${nextGoal.goal.title.replace(/^(Run|Land|Save|Learn|Read) (a |an )?/i, "")}`);
    if (!parts.length) parts.push(loops.length ? `${loops.length} open` : items.length ? `${items.length} this week` : "All clear");

    return {
      area,
      loops,
      items,
      goals,
      study,
      courses,
      count: loops.length + stepsToday,
      status: loops.length
        ? `${loops.length} ${loops.length === 1 ? "thing" : "things"}`
        : goals.length && goals.every((g) => !g.progress.missed.length)
          ? "On track"
          : items.length
            ? `${items.length} upcoming`
            : "Clear",
      note: parts.slice(0, 2).join(" · "),
      hot: overdue > 0 || dueToday > 0 || !!exam,
    };
  });
}

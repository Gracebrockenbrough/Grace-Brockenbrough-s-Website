import type { Goal, Profile } from "@/types";
import { buildGoal } from "@/services/goals";

/** Seed goals, planned the way Orbit would have planned them when they were added. */
function seed(text: string, created: string, id: string, doneThrough: string, skip: string[] = []): Goal {
  const goal = buildGoal(text, created, `${created}T09:00`);
  return {
    ...goal,
    id,
    steps: goal.steps.map((s, i) => ({ ...s, id: `${id}-s${i}`, done: s.date <= doneThrough && !skip.includes(s.date) })),
  };
}

export const mockGoals: Goal[] = [
  seed("Run a 5K by November 7", "2026-10-02", "goal-5k", "2026-10-08"),
  seed("Land a summer internship this semester", "2026-10-01", "goal-internship", "2026-10-08", ["2026-10-08"]),
];

/** Exam id → days the user studied for it. */
export const mockStudyLog: Record<string, string[]> = {
  "e-acct-1": ["2026-10-07"],
  "e-fin-mid": ["2026-10-08"],
};

/** Grace's profile, as if she had finished onboarding: a student who is also recruiting. */
export const defaultProfile: Profile = {
  lives: ["Student", "Job searching", "Health & fitness"],
  areas: ["school", "career", "health", "social", "travel", "personal"],
  messy: ["Things live in too many apps", "My schedule changes often"],
  involvement: "helpful",
  answers: {},
};

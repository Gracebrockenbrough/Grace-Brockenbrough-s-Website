import type { Category, ConnectedSource, Goal, Profile } from "@/types";

/**
 * "Help ORBIT know you": the next few questions worth asking and the
 * connections worth suggesting, plus a simple measure of how well ORBIT
 * understands the user's life so far.
 */

export interface KnowQuestion {
  id: string;
  area: Category;
  question: string;
  options: string[];
  /** What ORBIT does with the answer, in one line. */
  why: string;
}

export const KNOW_QUESTIONS: KnowQuestion[] = [
  { id: "focus", area: "school", question: "When do you focus best?", options: ["Morning", "Afternoon", "Night"], why: "ORBIT will suggest study time when you're sharpest." },
  { id: "sleep", area: "wellness", question: "When do you usually go to sleep?", options: ["Before 11", "11 to midnight", "After midnight"], why: "ORBIT won't plan things too late." },
  { id: "job", area: "work", question: "Do you work during the semester?", options: ["No", "On-campus job", "Part-time job", "Internship"], why: "ORBIT will protect your shifts and plan around them." },
  { id: "move", area: "wellness", question: "How do you like to move?", options: ["Running", "Gym", "Classes", "Not much yet"], why: "ORBIT will suggest workouts that fit open time." },
  { id: "home", area: "travel", question: "How do you get home for breaks?", options: ["Drive", "Fly", "Train or bus", "I stay on campus"], why: "ORBIT will remind you to book early." },
  { id: "people", area: "social", question: "Who do you want to keep up with?", options: ["Family", "Friends from home", "Both"], why: "ORBIT will nudge you when it's been a while." },
  { id: "money", area: "personal", question: "Do you keep a budget?", options: ["Yes", "Trying to", "Not really"], why: "ORBIT will watch for refunds and deposits you're owed." },
];

export interface ConnectSuggestion {
  source: ConnectedSource;
  why: string;
}

const CONNECT_WHY: Record<string, (goals: Goal[], p: Profile) => string | undefined> = {
  "src-strava": (g, p) => (g.some((x) => x.kind === "run") ? "Your 5K plan can check off runs on its own." : p.answers.move === "Running" ? "Log runs without typing them in." : undefined),
  "src-health": (g, p) => (p.answers.sleep ? "See how sleep lines up with busy weeks." : "Plans that fit your energy, not just your calendar."),
  "src-groupme": () => "Catch plans and requests from group chats.",
  "src-messages": () => "Notice texts that need a reply.",
  "src-reminders": () => "Bring your existing to-dos into one place.",
  "src-venmo": (_g, p) => (p.answers.money ? "Spot requests you still owe." : undefined),
  "src-spotify": (g) => (g.some((x) => x.kind === "run" || x.kind === "study") ? "Start a focus or running playlist with one tap." : undefined),
};

export interface KnowYou {
  score: number;
  /** Short label for the score. */
  level: string;
  questions: KnowQuestion[];
  connect: ConnectSuggestion[];
}

export function computeKnowYou(profile: Profile, sources: ConnectedSource[], goals: Goal[], courseCount: number): KnowYou {
  const connected = sources.filter((s) => s.status === "connected").length;
  const answered = Object.keys(profile.answers).length;
  const score = Math.min(
    100,
    (profile.userType ? 10 : 0) +
      (profile.hardest.length ? 5 : 0) +
      Math.min(30, connected * 6) +
      Math.min(30, answered * 5) +
      (goals.length ? 10 : 0) +
      (courseCount ? 10 : 0) +
      (profile.briefTime ? 5 : 0),
  );
  const level = score >= 85 ? "ORBIT knows you well" : score >= 60 ? "Getting to know you" : score >= 35 ? "Just getting started" : "Barely acquainted";

  const areas = new Set(profile.areas);
  const questions = KNOW_QUESTIONS.filter((q) => !profile.answers[q.id] && areas.has(q.area));

  const connect = sources
    .filter((s) => s.status === "available" && CONNECT_WHY[s.id])
    .map((source) => ({ source, why: CONNECT_WHY[source.id](goals, profile) }))
    .filter((c): c is ConnectSuggestion => !!c.why);

  return { score, level, questions, connect };
}

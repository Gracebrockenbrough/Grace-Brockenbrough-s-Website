import type {
  Assignment,
  CalendarEvent,
  Capture,
  ConnectedSource,
  DemoTime,
  DisplayPreference,
  InteractionSignal,
  Course,
  CourseDocument,
  CourseMilestone,
  Exam,
  ExtractedFact,
  Goal,
  Profile,
  LoopMeta,
  Message,
  NotificationSettings,
  OpenLoop,
  Preferences,
  User,
} from "@/types";
import { mockAssignments, mockCourses, mockDocuments, mockExams, mockMilestones } from "@/data/mockCourses";
import { mockEvents } from "@/data/mockEvents";
import { mockOpenLoops } from "@/data/mockOpenLoops";
import { mockMessages } from "@/data/mockMessages";
import { mockFacts } from "@/data/mockChanges";
import { mockSources } from "@/data/mockSources";
import { mockSignals } from "@/data/mockSignals";
import { defaultProfile, mockGoals, mockStudyLog } from "@/data/mockGoals";
import { defaultNotificationSettings, defaultPreferences, mockUser } from "@/data/mockUser";

export const STATE_VERSION = 7;

/**
 * Everything Orbit knows. Components never read mock files directly — they read
 * this state (as if it came from a backend) and derived views from the engine.
 */
export interface OrbitState {
  version: number;
  /** "demo" = Grace's sample week on a fixed clock; "live" = a real person's own data on the real clock. */
  mode: "demo" | "live";
  /** The day the morning brief was last opened (live mode shows it once a day). */
  briefSeenOn?: string;
  onboarded: boolean;
  briefSeen: boolean;
  user: User;
  courses: Course[];
  assignments: Assignment[];
  exams: Exam[];
  milestones: CourseMilestone[];
  documents: CourseDocument[];
  events: CalendarEvent[];
  loops: OpenLoop[];
  loopMeta: Record<string, LoopMeta>;
  messages: Message[];
  facts: ExtractedFact[];
  changeStatus: Record<string, "applied" | "dismissed">;
  conflictStatus: Record<string, "resolved" | "dismissed">;
  /** Ids of dismissed suggestions and attention items. */
  dismissed: string[];
  preferences: Preferences;
  notificationSettings: NotificationSettings;
  sources: ConnectedSource[];
  captures: Capture[];
  /** Behavior Orbit learns from. Capped; oldest dropped first. */
  signals: InteractionSignal[];
  displayPrefs: DisplayPreference;
  /** Answers to occasional learning questions, so Orbit doesn't ask twice. */
  promptsAnswered: Record<string, "yes" | "no">;
  /** Prototype only: which part of Friday the demo shows. */
  demoTime: DemoTime;
  goals: Goal[];
  /** Exam id → dates the user studied for it. */
  studyLog: Record<string, string[]>;
  /** Background answers from onboarding and "Help Orbit know you". */
  profile: Profile;
}

export function createInitialState(): OrbitState {
  // Deep copy so the seed modules are never mutated.
  return structuredClone({
    version: STATE_VERSION,
    mode: "demo" as const,
    onboarded: false,
    briefSeen: false,
    user: mockUser,
    courses: mockCourses,
    assignments: mockAssignments,
    exams: mockExams,
    milestones: mockMilestones,
    documents: mockDocuments,
    events: mockEvents,
    loops: mockOpenLoops,
    loopMeta: {},
    messages: mockMessages,
    facts: mockFacts,
    changeStatus: {},
    conflictStatus: {},
    dismissed: [],
    preferences: defaultPreferences,
    notificationSettings: defaultNotificationSettings,
    sources: mockSources,
    captures: [],
    signals: mockSignals,
    displayPrefs: {},
    promptsAnswered: {},
    demoTime: "morning" as DemoTime,
    goals: mockGoals,
    studyLog: mockStudyLog,
    profile: defaultProfile,
  });
}

/** A brand-new account: nothing but the person's name. Everything else they add. */
export function createLiveState(account?: { name?: string; email?: string | null }): OrbitState {
  const base = createInitialState();
  const full = (account?.name ?? "").trim();
  return {
    ...base,
    mode: "live",
    onboarded: false,
    briefSeen: false,
    user: { ...base.user, id: "me", name: full.split(/\s+/)[0] ?? "", fullName: full, email: account?.email ?? "", school: "", year: "" },
    courses: [],
    assignments: [],
    exams: [],
    milestones: [],
    documents: [],
    events: [],
    loops: [],
    messages: [],
    facts: [],
    // Connections are not live yet: nothing is connected, nothing has sample data.
    sources: base.sources.map((s) => ({ ...s, status: "available" as const, hasDemoData: false })),
    signals: [],
    goals: [],
    studyLog: {},
    preferences: { ...base.preferences, ignoredSources: [] },
    profile: { lives: [], areas: ["work", "health", "social", "personal"], messy: [], involvement: "helpful", answers: {} },
  };
}

/**
 * Brings a saved state forward to the current shape. Real people's data is
 * never thrown away: missing fields are filled from a fresh state.
 */
export function migrateState(saved: unknown): OrbitState | null {
  if (!saved || typeof saved !== "object") return null;
  const s = saved as Partial<OrbitState>;
  if (s.version === STATE_VERSION) return s as OrbitState;
  if (s.mode === "live") {
    const fresh = createLiveState();
    return { ...fresh, ...s, version: STATE_VERSION, profile: { ...fresh.profile, ...(s.profile ?? {}) } } as OrbitState;
  }
  // Old sample-data saves are simply replaced by the current demo.
  return null;
}

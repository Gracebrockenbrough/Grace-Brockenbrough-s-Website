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
import { defaultNotificationSettings, defaultPreferences, mockUser } from "@/data/mockUser";

export const STATE_VERSION = 4;

/**
 * Everything ORBIT knows. Components never read mock files directly — they read
 * this state (as if it came from a backend) and derived views from the engine.
 */
export interface OrbitState {
  version: number;
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
  /** Behavior ORBIT learns from. Capped; oldest dropped first. */
  signals: InteractionSignal[];
  displayPrefs: DisplayPreference;
  /** Answers to occasional learning questions, so ORBIT doesn't ask twice. */
  promptsAnswered: Record<string, "yes" | "no">;
  /** Prototype only: which part of Friday the demo shows. */
  demoTime: DemoTime;
}

export function createInitialState(): OrbitState {
  // Deep copy so the seed modules are never mutated.
  return structuredClone({
    version: STATE_VERSION,
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
  });
}

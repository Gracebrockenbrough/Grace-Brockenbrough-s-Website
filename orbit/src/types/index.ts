/**
 * ORBIT core data model.
 *
 * Dates are stored as local, timezone-free strings so the demo behaves the
 * same everywhere:  date = "YYYY-MM-DD", time = "HH:MM", datetime = "YYYY-MM-DDTHH:MM".
 * A real backend would store UTC plus the user's timezone.
 */

export type ID = string;

// ---------------------------------------------------------------------------
// Sources — where ORBIT learned something
// ---------------------------------------------------------------------------

export type SourceKind =
  | "email"
  | "calendar"
  | "syllabus"
  | "groupme"
  | "text"
  | "canvas"
  | "manual"
  | "screenshot"
  | "voice"
  | "orbit";

export interface Source {
  kind: SourceKind;
  /** Human label, e.g. "Professor Reyes email" or "FIN 359 syllabus". */
  label: string;
  /** Optional pointer to the originating record (message id, document id). */
  ref?: ID;
}

export interface ConnectedSource {
  id: ID;
  name: string;
  kind: SourceKind;
  status: "connected" | "demo" | "disconnected";
  enabled: boolean;
  detail: string;
}

// ---------------------------------------------------------------------------
// People & preferences
// ---------------------------------------------------------------------------

export type SenderType =
  | "professor"
  | "employer"
  | "advisor"
  | "professional"
  | "family"
  | "school_system"
  | "organization"
  | "friend"
  | "promotional";

export interface IgnoredSource {
  key: string; // e.g. "sender:Finance Club GroupMe"
  label: string;
}

export interface Preferences {
  /** Learned adjustments keyed by "sender:<name>" or "type:<senderType>". */
  sourceAdjust: Record<string, number>;
  ignoredSources: IgnoredSource[];
  /** Learned adjustments to kinds of recommendations, e.g. "attention:missing_info". */
  recommendationAdjust: Record<string, number>;
}

export interface NotificationSettings {
  morningBrief: boolean;
  importantChanges: boolean;
  urgentDeadlines: boolean;
  needsReply: boolean;
}

export interface User {
  id: ID;
  name: string;
  fullName: string;
  email: string;
  timezone: string;
  school: string;
  year: string;
}

// ---------------------------------------------------------------------------
// School
// ---------------------------------------------------------------------------

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday = 0

export interface Course {
  id: ID;
  code: string;
  name: string;
  professor: string;
  professorEmail: string;
  officeHours: string;
  officeHoursSource?: Source;
  meetingDays: Weekday[];
  startTime: string;
  endTime: string;
  location: string;
  color: CourseColor;
  syllabusDocumentId?: ID;
}

export type CourseColor = "indigo" | "teal" | "amber" | "rose";

export type AssignmentType = "assignment" | "reading" | "project" | "paper" | "presentation" | "problem_set";
export type Effort = "small" | "medium" | "large";

export interface Assignment {
  id: ID;
  courseId: ID;
  title: string;
  type: AssignmentType;
  /** Undefined when the source did not state a clear date. */
  due?: string;
  effort: Effort;
  completed: boolean;
  source: Source;
  confidence: number;
  note?: string;
}

export interface Exam {
  id: ID;
  courseId: ID;
  title: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  source: Source;
  confidence: number;
}

export interface CourseMilestone {
  id: ID;
  courseId: ID;
  title: string;
  date?: string;
  source: Source;
  confidence: number;
}

export interface CourseDocument {
  id: ID;
  courseId: ID;
  name: string;
  kind: "syllabus" | "notes" | "image" | "other";
  addedAt: string;
  pages?: number;
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export type EventCategory =
  | "class"
  | "exam"
  | "meeting"
  | "appointment"
  | "study"
  | "personal"
  | "social"
  | "travel"
  | "deadline";

export interface CalendarEvent {
  id: ID;
  title: string;
  date: string;
  /** Optional for all-day items. */
  startTime?: string;
  endTime?: string;
  endDate?: string;
  category: EventCategory;
  source: Source;
  location?: string;
  /** Real commitments ORBIT must never move without approval. */
  hardCommitment: boolean;
  confidence: number;
  courseId?: ID;
  /** Shown on the Month view. */
  major?: boolean;
  /** Suggested by ORBIT and accepted by the user. */
  suggestedByOrbit?: boolean;
  /** Open Loop this block was planned for. */
  loopId?: ID;
  /** Exam this block prepares for. */
  prepForExamId?: ID;
}

/** Unified, read-only shape the calendar renders (events, classes, exams, deadlines). */
export interface CalendarItem extends CalendarEvent {
  kind: "event" | "class" | "exam" | "deadline";
  /** Original record id, for opening details. */
  refId: ID;
  pendingChange?: ID;
}

// ---------------------------------------------------------------------------
// Open Loops
// ---------------------------------------------------------------------------

export type Category = "school" | "work" | "personal";
export type Consequence = "academic" | "professional" | "financial" | "travel" | "social" | "low";
export type LoopStatus = "now" | "soon" | "later" | "waiting" | "done";
export type PriorityLevel = "high" | "medium" | "low";

export interface OpenLoop {
  id: ID;
  title: string;
  description?: string;
  category: Category;
  source: Source;
  deadline?: string;
  hardDeadline: boolean;
  consequence: Consequence;
  senderType: SenderType;
  requiresResponse: boolean;
  /** User already looked at it but has not acted. */
  interacted?: boolean;
  moneyAtRisk?: number;
  /** Something else depends on this. */
  blocks?: string;
  waitingOn?: string;
  courseId?: ID;
  messageId?: ID;
  effortMinutes?: number;
  confidence: number;
  completed: boolean;
  createdAt: string;
  /** Short explanation for the "Why this?" popover. */
  why?: string;
}

/** User-driven overrides that apply to stored and derived loops alike. */
export interface LoopMeta {
  snoozedUntil?: string;
  statusOverride?: LoopStatus;
  priorityOverride?: PriorityLevel;
  deadlineOverride?: string;
  removed?: boolean;
  completed?: boolean;
  completedAt?: string;
  notImportant?: boolean;
}

/** A loop after ORBIT has scored it. Never show the raw score to users. */
export interface RankedLoop extends OpenLoop {
  priorityScore: number;
  priority: PriorityLevel;
  status: LoopStatus;
  snoozed: boolean;
  derivedFrom: "loop" | "assignment" | "message";
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type MessageClass = "requires_reply" | "action_required" | "important_information" | "optional" | "noise";

export interface Message {
  id: ID;
  sender: string;
  senderType: SenderType;
  senderDetail?: string;
  subject?: string;
  content: string;
  timestamp: string;
  source: SourceKind;
  channel: string;
  opened: boolean;
  directQuestion: boolean;
  responded: boolean;
  massMessage: boolean;
  courseId?: ID;
  /** What a reply is about, used for the derived Open Loop. */
  replyAction?: string;
  /** When a response realistically matters by. */
  respondBy?: string;
  dismissed?: boolean;
  markedImportant?: boolean;
  remindLater?: boolean;
}

export interface MessageClassification {
  category: MessageClass;
  importance: PriorityLevel;
  urgency: PriorityLevel;
  confidence: number;
  reason: string;
  importanceScore: number;
}

// ---------------------------------------------------------------------------
// Intelligence outputs
// ---------------------------------------------------------------------------

/** A fact ORBIT extracted from an incoming source that may contradict what it knows. */
export interface ExtractedFact {
  id: ID;
  entityType: "exam" | "assignment";
  entityId: ID;
  field: "datetime";
  value: { date: string; startTime?: string; endTime?: string };
  source: Source;
  confidence: number;
  quote: string;
}

export interface DetectedChange {
  id: ID;
  entityType: "exam" | "assignment";
  entityId: ID;
  title: string;
  courseId: ID;
  previousValue: { date?: string; startTime?: string };
  newValue: { date: string; startTime?: string; endTime?: string };
  source: Source;
  quote: string;
  importance: PriorityLevel;
  confidence: number;
  requiresApproval: boolean;
}

export type ConflictType = "time" | "workload" | "prep" | "missing_info";

export interface Conflict {
  id: ID;
  type: ConflictType;
  title: string;
  summary: string;
  date?: string;
  itemIds: ID[];
  items?: CalendarItem[];
  overlapMinutes?: number;
  severity: PriorityLevel;
}

export interface FreeTimeSuggestion {
  id: ID;
  date: string;
  start: string;
  end: string;
  minutes: number;
  title: string;
  detail: string;
  why: string;
  loopId?: ID;
  courseId?: ID;
  planTitle: string;
  planEnd: string;
}

export type AttentionKind =
  | "change"
  | "possible_change"
  | "conflict"
  | "deadline"
  | "prep"
  | "missing_info"
  | "workload";

export interface AttentionItem {
  id: ID;
  kind: AttentionKind;
  label: string;
  title: string;
  body: string;
  why: string;
  weight: number;
  refId: ID;
}

export interface MorningBrief {
  greeting: string;
  headline: string;
  priorities: { id: ID; title: string; detail: string }[];
  schedule: string[];
  watchOut?: string;
  change?: string;
  lookingAhead?: string;
}

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------

export type CaptureInputKind = "text" | "voice" | "photo" | "screenshot" | "file";

export interface Capture {
  id: ID;
  kind: CaptureInputKind;
  raw: string;
  createdAt: string;
  resultSummary: string;
}

export type CaptureResult =
  | { type: "loop"; loop: OpenLoop; headline: string; detail: string }
  | { type: "event"; event: CalendarEvent; headline: string; detail: string }
  | { type: "completion"; loopId: ID; loopTitle: string; headline: string; detail: string }
  | { type: "office_hours"; courseId?: ID; value: string; headline: string; detail: string }
  | { type: "ignore_source"; key: string; label: string; headline: string; detail: string }
  | { type: "syllabus"; fileName: string; headline: string; detail: string }
  | { type: "unclear"; headline: string; detail: string };

// ---------------------------------------------------------------------------
// Syllabus import
// ---------------------------------------------------------------------------

export type SyllabusItemKind = "assignment" | "exam" | "presentation" | "milestone";

export interface SyllabusItem {
  id: ID;
  kind: SyllabusItemKind;
  title: string;
  date?: string;
  time?: string;
  effort: Effort;
  confidence: number;
  note?: string;
  quote: string;
}

export interface SyllabusExtraction {
  courseId: ID;
  courseGuess: string;
  fileName: string;
  pages: number;
  items: SyllabusItem[];
  officeHours?: string;
}

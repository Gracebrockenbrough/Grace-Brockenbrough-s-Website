import type {
  Assignment,
  CalendarEvent,
  Capture,
  CourseDocument,
  CourseMilestone,
  Exam,
  LoopMeta,
  LoopStatus,
  NotificationSettings,
  OpenLoop,
  PriorityLevel,
  SenderType,
} from "@/types";
import { createInitialState, type OrbitState } from "./state";

export type MessageFeedback = "not_important" | "important" | "replied" | "remind_later" | "ignore_source";

export type OrbitAction =
  | { type: "HYDRATE"; state: OrbitState }
  | { type: "RESET_DEMO" }
  | { type: "COMPLETE_ONBOARDING" }
  | { type: "SET_BRIEF_SEEN"; seen: boolean }
  // Open Loops
  | { type: "COMPLETE_LOOP"; id: string; at: string }
  | { type: "REOPEN_LOOP"; id: string }
  | { type: "SNOOZE_LOOP"; id: string; until: string }
  | { type: "UNSNOOZE_LOOP"; id: string }
  | { type: "SET_LOOP_STATUS"; id: string; status: LoopStatus | undefined }
  | { type: "SET_LOOP_PRIORITY"; id: string; priority: PriorityLevel | undefined }
  | { type: "RESCHEDULE_LOOP"; id: string; deadline: string }
  | { type: "REMOVE_LOOP"; id: string }
  | { type: "MARK_LOOP_NOT_IMPORTANT"; id: string; sourceKey?: string }
  | { type: "ADD_LOOP"; loop: OpenLoop }
  | { type: "EDIT_LOOP"; id: string; patch: Partial<Pick<OpenLoop, "title" | "description" | "category">> }
  // Messages & learning
  | { type: "MESSAGE_FEEDBACK"; id: string; feedback: MessageFeedback }
  | { type: "ADJUST_SOURCE"; key: string; delta: number }
  | { type: "IGNORE_SOURCE"; key: string; label: string }
  | { type: "UNIGNORE_SOURCE"; key: string }
  | { type: "ADJUST_RECOMMENDATION"; key: string; delta: number }
  | { type: "RESET_LEARNING" }
  // Changes, conflicts, suggestions
  | { type: "APPLY_CHANGE"; changeId: string; entityType: "exam" | "assignment"; entityId: string; value: { date: string; startTime?: string; endTime?: string } }
  | { type: "DISMISS_CHANGE"; changeId: string }
  | {
      type: "RESOLVE_CONFLICT";
      conflictId: string;
      eventPatches?: { id: string; patch: Partial<CalendarEvent> }[];
      addEvents?: CalendarEvent[];
      removeEventIds?: string[];
    }
  | { type: "DISMISS_CONFLICT"; conflictId: string }
  | { type: "DISMISS"; id: string }
  | { type: "UNDISMISS"; id: string }
  // Calendar
  | { type: "ADD_EVENT"; event: CalendarEvent }
  | { type: "UPDATE_EVENT"; id: string; patch: Partial<CalendarEvent> }
  | { type: "REMOVE_EVENT"; id: string }
  | { type: "SET_EXAM_DATE"; id: string; date: string; startTime?: string; endTime?: string }
  // Courses
  | { type: "SET_ASSIGNMENT_DUE"; id: string; due: string }
  | { type: "TOGGLE_ASSIGNMENT"; id: string }
  | { type: "UPDATE_OFFICE_HOURS"; courseId: string; value: string; sourceLabel: string }
  | {
      type: "IMPORT_SYLLABUS";
      courseId: string;
      document: CourseDocument;
      assignments: Assignment[];
      exams: Exam[];
      milestones: CourseMilestone[];
      officeHours?: string;
    }
  // Settings
  | { type: "SET_SOURCE_ENABLED"; id: string; enabled: boolean }
  | { type: "SET_NOTIFICATION"; key: keyof NotificationSettings; value: boolean }
  // Capture
  | { type: "ADD_CAPTURE"; capture: Capture };

function updateMeta(state: OrbitState, id: string, patch: Partial<LoopMeta>): OrbitState {
  return { ...state, loopMeta: { ...state.loopMeta, [id]: { ...state.loopMeta[id], ...patch } } };
}

/** Derived loops (assignment or message) write through to their origin record. */
function setLoopCompletion(state: OrbitState, id: string, completed: boolean, at?: string): OrbitState {
  let next = updateMeta(state, id, { completed, completedAt: completed ? at : undefined });
  if (id.startsWith("asg:")) {
    const assignmentId = id.slice(4);
    next = { ...next, assignments: next.assignments.map((a) => (a.id === assignmentId ? { ...a, completed } : a)) };
  } else if (id.startsWith("msg:")) {
    const messageId = id.slice(4);
    next = { ...next, messages: next.messages.map((m) => (m.id === messageId ? { ...m, responded: completed } : m)) };
  } else {
    next = { ...next, loops: next.loops.map((l) => (l.id === id ? { ...l, completed } : l)) };
  }
  return next;
}

function adjust(map: Record<string, number>, key: string, delta: number): Record<string, number> {
  const value = Math.max(-40, Math.min(40, (map[key] ?? 0) + delta));
  return { ...map, [key]: value };
}

export const senderKey = (sender: string) => `sender:${sender}`;
export const typeKey = (type: SenderType) => `type:${type}`;

export function orbitReducer(state: OrbitState, action: OrbitAction): OrbitState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "RESET_DEMO":
      return { ...createInitialState(), onboarded: true, briefSeen: false };
    case "COMPLETE_ONBOARDING":
      return { ...state, onboarded: true };
    case "SET_BRIEF_SEEN":
      return { ...state, briefSeen: action.seen };

    // ---- Open Loops -------------------------------------------------------
    case "COMPLETE_LOOP":
      return setLoopCompletion(state, action.id, true, action.at);
    case "REOPEN_LOOP":
      return setLoopCompletion(updateMeta(state, action.id, { statusOverride: undefined }), action.id, false);
    case "SNOOZE_LOOP": {
      let next = updateMeta(state, action.id, { snoozedUntil: action.until });
      if (action.id.startsWith("msg:")) {
        const messageId = action.id.slice(4);
        next = { ...next, messages: next.messages.map((m) => (m.id === messageId ? { ...m, remindLater: true } : m)) };
      }
      return next;
    }
    case "UNSNOOZE_LOOP": {
      let next = updateMeta(state, action.id, { snoozedUntil: undefined });
      if (action.id.startsWith("msg:")) {
        const messageId = action.id.slice(4);
        next = { ...next, messages: next.messages.map((m) => (m.id === messageId ? { ...m, remindLater: false } : m)) };
      }
      return next;
    }
    case "SET_LOOP_STATUS":
      return updateMeta(state, action.id, {
        statusOverride: action.status,
        // Moving something to "Now" wakes it up.
        ...(action.status === "now" ? { snoozedUntil: undefined } : {}),
      });
    case "SET_LOOP_PRIORITY":
      return updateMeta(state, action.id, { priorityOverride: action.priority, notImportant: false });
    case "RESCHEDULE_LOOP": {
      if (action.id.startsWith("asg:")) {
        const assignmentId = action.id.slice(4);
        return {
          ...state,
          assignments: state.assignments.map((a) => (a.id === assignmentId ? { ...a, due: action.deadline, confidence: 1 } : a)),
        };
      }
      return updateMeta(state, action.id, { deadlineOverride: action.deadline, snoozedUntil: undefined });
    }
    case "REMOVE_LOOP":
      return updateMeta(state, action.id, { removed: true });
    case "MARK_LOOP_NOT_IMPORTANT": {
      let next = updateMeta(state, action.id, { notImportant: true, priorityOverride: "low" });
      if (action.sourceKey) {
        next = { ...next, preferences: { ...next.preferences, sourceAdjust: adjust(next.preferences.sourceAdjust, action.sourceKey, -12) } };
      }
      return next;
    }
    case "ADD_LOOP":
      return { ...state, loops: [action.loop, ...state.loops] };
    case "EDIT_LOOP":
      return { ...state, loops: state.loops.map((l) => (l.id === action.id ? { ...l, ...action.patch } : l)) };

    // ---- Messages & learning ---------------------------------------------
    case "MESSAGE_FEEDBACK": {
      const message = state.messages.find((m) => m.id === action.id);
      if (!message) return state;
      const key = senderKey(message.sender);
      const prefs = state.preferences;
      switch (action.feedback) {
        case "not_important":
          return {
            ...state,
            messages: state.messages.map((m) => (m.id === action.id ? { ...m, dismissed: true, markedImportant: false } : m)),
            preferences: { ...prefs, sourceAdjust: adjust(prefs.sourceAdjust, key, -15) },
          };
        case "important":
          return {
            ...state,
            messages: state.messages.map((m) => (m.id === action.id ? { ...m, markedImportant: true, dismissed: false } : m)),
            preferences: { ...prefs, sourceAdjust: adjust(prefs.sourceAdjust, key, 15) },
          };
        case "replied":
          return setLoopCompletion(state, `msg:${action.id}`, true);
        case "remind_later":
          return {
            ...updateMeta(state, `msg:${action.id}`, { snoozedUntil: "2026-10-10T09:00" }),
            messages: state.messages.map((m) => (m.id === action.id ? { ...m, remindLater: true } : m)),
          };
        case "ignore_source":
          if (prefs.ignoredSources.some((s) => s.key === key)) return state;
          return {
            ...state,
            preferences: { ...prefs, ignoredSources: [...prefs.ignoredSources, { key, label: message.sender }] },
          };
      }
      return state;
    }
    case "ADJUST_SOURCE":
      return {
        ...state,
        preferences: { ...state.preferences, sourceAdjust: adjust(state.preferences.sourceAdjust, action.key, action.delta) },
      };
    case "IGNORE_SOURCE":
      if (state.preferences.ignoredSources.some((s) => s.key === action.key)) return state;
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ignoredSources: [...state.preferences.ignoredSources, { key: action.key, label: action.label }],
        },
      };
    case "UNIGNORE_SOURCE":
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ignoredSources: state.preferences.ignoredSources.filter((s) => s.key !== action.key),
        },
      };
    case "ADJUST_RECOMMENDATION":
      return {
        ...state,
        preferences: {
          ...state.preferences,
          recommendationAdjust: adjust(state.preferences.recommendationAdjust, action.key, action.delta),
        },
      };
    case "RESET_LEARNING":
      return { ...state, preferences: { sourceAdjust: {}, ignoredSources: [], recommendationAdjust: {} } };

    // ---- Changes, conflicts, suggestions ---------------------------------
    case "APPLY_CHANGE": {
      const next = { ...state, changeStatus: { ...state.changeStatus, [action.changeId]: "applied" as const } };
      if (action.entityType === "exam") {
        return {
          ...next,
          exams: next.exams.map((e) =>
            e.id === action.entityId
              ? { ...e, date: action.value.date, startTime: action.value.startTime ?? e.startTime, endTime: action.value.endTime ?? e.endTime, confidence: 1 }
              : e,
          ),
        };
      }
      return {
        ...next,
        assignments: next.assignments.map((a) =>
          a.id === action.entityId ? { ...a, due: `${action.value.date}T${action.value.startTime ?? "23:59"}`, confidence: 1 } : a,
        ),
      };
    }
    case "DISMISS_CHANGE":
      return { ...state, changeStatus: { ...state.changeStatus, [action.changeId]: "dismissed" } };
    case "RESOLVE_CONFLICT": {
      let events = state.events;
      for (const { id, patch } of action.eventPatches ?? []) {
        events = events.map((e) => (e.id === id ? { ...e, ...patch } : e));
      }
      if (action.addEvents) events = [...events, ...action.addEvents];
      if (action.removeEventIds) events = events.filter((e) => !action.removeEventIds!.includes(e.id));
      return { ...state, events, conflictStatus: { ...state.conflictStatus, [action.conflictId]: "resolved" } };
    }
    case "DISMISS_CONFLICT":
      return { ...state, conflictStatus: { ...state.conflictStatus, [action.conflictId]: "dismissed" } };
    case "DISMISS":
      return state.dismissed.includes(action.id) ? state : { ...state, dismissed: [...state.dismissed, action.id] };
    case "UNDISMISS":
      return { ...state, dismissed: state.dismissed.filter((d) => d !== action.id) };

    // ---- Calendar ----------------------------------------------------------
    case "ADD_EVENT":
      return { ...state, events: [...state.events, action.event] };
    case "UPDATE_EVENT":
      return { ...state, events: state.events.map((e) => (e.id === action.id ? { ...e, ...action.patch } : e)) };
    case "REMOVE_EVENT":
      return { ...state, events: state.events.filter((e) => e.id !== action.id) };
    case "SET_EXAM_DATE":
      return {
        ...state,
        exams: state.exams.map((e) =>
          e.id === action.id
            ? { ...e, date: action.date, startTime: action.startTime ?? e.startTime, endTime: action.endTime ?? e.endTime, confidence: 1, source: { kind: "manual", label: "Confirmed by you" } }
            : e,
        ),
      };

    // ---- Courses -----------------------------------------------------------
    case "SET_ASSIGNMENT_DUE":
      return { ...state, assignments: state.assignments.map((a) => (a.id === action.id ? { ...a, due: action.due, confidence: 1 } : a)) };
    case "TOGGLE_ASSIGNMENT": {
      const assignment = state.assignments.find((a) => a.id === action.id);
      if (!assignment) return state;
      return setLoopCompletion(state, `asg:${action.id}`, !assignment.completed);
    }
    case "UPDATE_OFFICE_HOURS":
      return {
        ...state,
        courses: state.courses.map((c) =>
          c.id === action.courseId ? { ...c, officeHours: action.value, officeHoursSource: { kind: "manual", label: action.sourceLabel } } : c,
        ),
      };
    case "IMPORT_SYLLABUS":
      return {
        ...state,
        documents: [...state.documents.filter((d) => d.id !== action.document.id), action.document],
        assignments: [...state.assignments.filter((a) => a.courseId !== action.courseId || a.source.kind !== "syllabus"), ...action.assignments],
        exams: [...state.exams.filter((e) => e.courseId !== action.courseId || e.source.kind !== "syllabus"), ...action.exams],
        milestones: [...state.milestones.filter((m) => m.courseId !== action.courseId || m.source.kind !== "syllabus"), ...action.milestones],
        courses: state.courses.map((c) =>
          c.id === action.courseId
            ? {
                ...c,
                syllabusDocumentId: action.document.id,
                officeHours: action.officeHours ?? c.officeHours,
                officeHoursSource: action.officeHours ? { kind: "syllabus", label: `${c.code} syllabus` } : c.officeHoursSource,
              }
            : c,
        ),
      };

    // ---- Settings ----------------------------------------------------------
    case "SET_SOURCE_ENABLED":
      return { ...state, sources: state.sources.map((s) => (s.id === action.id ? { ...s, enabled: action.enabled } : s)) };
    case "SET_NOTIFICATION":
      return { ...state, notificationSettings: { ...state.notificationSettings, [action.key]: action.value } };

    case "ADD_CAPTURE":
      return { ...state, captures: [action.capture, ...state.captures].slice(0, 30) };
  }
}

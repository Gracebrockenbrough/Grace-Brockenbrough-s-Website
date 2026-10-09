import type { Message, MessageClassification, Preferences, SenderType } from "@/types";
import { hoursBetween, parseDateTime } from "@/lib/time";

/** Relationship/source importance. Adapted at runtime by learned preferences. */
export const SENDER_IMPORTANCE: Record<SenderType, number> = {
  professor: 12,
  employer: 12,
  advisor: 12,
  professional: 10,
  family: 8,
  school_system: 6,
  organization: 3,
  friend: 2,
  promotional: 0,
};

export const SENDER_LABEL: Record<SenderType, string> = {
  professor: "Professor",
  employer: "Employer",
  advisor: "Advisor",
  professional: "Professional contact",
  family: "Family",
  school_system: "School",
  organization: "Organization",
  friend: "Friend",
  promotional: "Promotion",
};

export const MESSAGE_CLASS_LABEL: Record<MessageClassification["category"], string> = {
  requires_reply: "Needs reply",
  action_required: "Action needed",
  important_information: "Important update",
  optional: "Optional",
  noise: "Informational",
};

const ACTION_WORDS = /\b(deadline|due|closes?|submit|confirm|register|form|apply)\b/i;
const CHANGE_WORDS = /\b(moved|rescheduled|changed|cancel+ed|new (date|time|room))\b/i;

export function senderAdjustment(message: Pick<Message, "sender" | "senderType">, prefs: Preferences): number {
  return (prefs.sourceAdjust[`sender:${message.sender}`] ?? 0) + (prefs.sourceAdjust[`type:${message.senderType}`] ?? 0);
}

export function isIgnored(sender: string, prefs: Preferences): boolean {
  return prefs.ignoredSources.some((s) => s.key === `sender:${sender}`);
}

/**
 * Rule-based message classifier. Structured so a language model can replace
 * the body later: same input, same output shape.
 */
export function classifyMessage(message: Message, prefs: Preferences): MessageClassification {
  const adjust = senderAdjustment(message, prefs);
  const base = SENDER_IMPORTANCE[message.senderType] * 5;
  const text = `${message.subject ?? ""} ${message.content}`;
  const hasAction = ACTION_WORDS.test(text);
  const hasChange = CHANGE_WORDS.test(text);

  let importanceScore =
    base + (message.directQuestion ? 20 : 0) + (hasAction ? 12 : 0) + (hasChange ? 15 : 0) - (message.massMessage ? 10 : 0) + adjust;
  if (message.markedImportant) importanceScore += 25;

  const importance = importanceScore >= 60 ? "high" : importanceScore >= 30 ? "medium" : "low";

  if (isIgnored(message.sender, prefs)) {
    return { category: "noise", importance: "low", urgency: "low", confidence: 0.99, importanceScore: 0, reason: "You asked ORBIT to ignore this source." };
  }
  if (message.senderType === "promotional") {
    return { category: "noise", importance: "low", urgency: "low", confidence: 0.97, importanceScore, reason: "Promotional message." };
  }
  if (message.dismissed) {
    return { category: "optional", importance: "low", urgency: "low", confidence: 0.95, importanceScore, reason: "You marked this as not important." };
  }
  if (message.directQuestion && !message.massMessage) {
    return {
      category: "requires_reply",
      importance: importance === "low" ? "medium" : importance,
      urgency: message.respondBy ? "high" : "medium",
      confidence: 0.93,
      importanceScore,
      reason: `${message.sender} asked you a direct question.`,
    };
  }
  if (hasChange && (message.senderType === "professor" || message.senderType === "school_system")) {
    return { category: "important_information", importance: "high", urgency: "high", confidence: 0.9, importanceScore, reason: "Something you're tracking appears to have changed." };
  }
  if (hasAction && importanceScore >= 25) {
    return { category: "action_required", importance, urgency: "high", confidence: 0.88, importanceScore, reason: "It includes a deadline or something to submit." };
  }
  if (message.massMessage && !hasAction && (message.senderType === "organization" || message.senderType === "friend")) {
    return { category: "optional", importance: "low", urgency: "low", confidence: 0.85, importanceScore, reason: "Group message with nothing you need to do." };
  }
  return { category: "noise", importance: "low", urgency: "low", confidence: 0.8, importanceScore, reason: "Informational only." };
}

export function requiresReply(message: Message, prefs: Preferences): boolean {
  return classifyMessage(message, prefs).category === "requires_reply" && !message.responded && !message.dismissed;
}

/** Plain-language reason for surfacing a reply, shown behind "Why this?". */
export function replyWhy(message: Message, now: Date): string {
  const parts: string[] = [`${message.sender} asked you a direct question`];
  const ageHours = hoursBetween(parseDateTime(message.timestamp), now);
  if (message.opened && ageHours > 6) parts.push("you opened it but haven't replied");
  else if (!message.opened) parts.push("you haven't opened it yet");
  if (message.id === "m-martin") parts.push("the meeting she's asking about is Monday");
  if (message.senderType === "employer") parts.push("interview slots fill up quickly");
  return `${parts.join(", ")}.`.replace(/^./, (c) => c.toUpperCase());
}

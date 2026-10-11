/**
 * Template drafting for texts and emails. Orbit writes; the user copies or
 * opens their own app and sends it themselves.
 */

export const TONES = ["Friendly", "Casual", "Formal", "Brief", "Apologetic"] as const;
export type Tone = (typeof TONES)[number];

const SIGN = "Grace";
const FULL = "Grace Brockenbrough";

/** Rewrites a draft in a different tone. */
export function toneDraft(base: string, tone: Tone): string {
  const lines = base.split("\n");
  const greeting = /^(hi|hey|hello|dear)\b/i.test(lines[0]) ? lines[0].replace(/[,!]$/, "") : "";
  const name = greeting.replace(/^(hi|hey|hello|dear)\s*/i, "");
  const signIdx = lines.findIndex((l) => /^(best|thank you|thanks|love|cheers)/i.test(l.trim()));
  const body = lines.slice(greeting ? 1 : 0, signIdx >= 0 ? signIdx : undefined).join("\n").trim();
  const firstSentence = body.split(/(?<=[.!?])\s/)[0];
  switch (tone) {
    case "Friendly":
      return base;
    case "Casual":
      return `${name ? `Hey ${name}! ` : ""}${body}`;
    case "Formal":
      return `${name ? `Dear ${name},\n\n` : ""}${body}\n\nBest regards,\n${FULL}`;
    case "Brief":
      return `${firstSentence}${name ? `\n\nThanks,\n${SIGN}` : ""}`;
    case "Apologetic":
      return `${greeting ? `${greeting},\n\n` : ""}Sorry for the slow reply! ${body}${signIdx >= 0 ? `\n\n${lines.slice(signIdx).join("\n")}` : ""}`;
  }
}

export const COMPOSE_IDEAS: { label: string; kind: "text" | "email"; to: string; about: string }[] = [
  { label: "Ask for an extension", kind: "email", to: "Professor Hale", about: "ask for a two-day extension on the problem set" },
  { label: "Running late", kind: "text", to: "Sarah", about: "running late" },
  { label: "Thank-you after a coffee chat", kind: "email", to: "Martin", about: "thank you for the coffee chat" },
  { label: "Check in with Mom", kind: "text", to: "Mom", about: "check in" },
  { label: "Move a meeting", kind: "email", to: "Maya", about: "move our meeting to another time" },
];

/** First draft from "who" and "what about". Simple patterns stand in for a writing model. */
export function composeDraft({ kind, to, about }: { kind: "text" | "email"; to: string; about: string }): { subject: string; body: string } {
  const who = to.trim() || (kind === "email" ? "there" : "");
  const first = who.replace(/^(professor|prof\.?|dr\.?|mr\.?|ms\.?|mrs\.?)\s+/i, "");
  const a = about.trim().replace(/[.!]+$/, "");
  const lower = a.toLowerCase();
  const formal = /^(professor|prof|dr)\b/i.test(who);
  const hello = kind === "email" ? (formal ? `Dear ${who},` : `Hi ${first},`) : who ? `Hey ${first}!` : "Hey!";
  const sign = kind === "email" ? `\n\nBest,\n${SIGN}` : "";

  if (/extension/.test(lower)) {
    const what = lower.match(/on (the )?(.+)$/)?.[2] ?? "the assignment";
    return {
      subject: `Extension request: ${what}`,
      body: `${hello}\n\nI'm writing to ask whether I could have a short extension on ${what}. I have two exams this week and want to turn in work I'm proud of. Would submitting it by Monday evening be okay?\n\nThank you for considering it.${sign}`,
    };
  }
  if (/late/.test(lower)) return { subject: "Running late", body: `${hello} Running about 10 minutes late, so sorry. Be there soon!${sign}` };
  if (/thank/.test(lower)) {
    const what = lower.replace(/^thank(s| you)( for)?\s*/, "") || "your time";
    return {
      subject: "Thank you",
      body: `${hello}\n\nThank you so much for ${what.startsWith("the") || what.startsWith("your") ? what : `the ${what}`}. I really appreciated your advice and it helped me think about next steps. I'd love to stay in touch.${sign}`,
    };
  }
  if (/follow(ing)? up|nudge/.test(lower)) {
    const what = lower.replace(/^.*?(follow(ing)? up|nudge)( on| about)?\s*/, "") || "this";
    return {
      subject: `Following up: ${what}`,
      body:
        kind === "email"
          ? `${hello}\n\nI wanted to follow up on ${what}. Is there anything you need from me in the meantime? Thanks so much.${sign}`
          : `${hello} Just checking on ${what} — no rush, just want to make sure I'm ready. Thanks!`,
    };
  }
  if (/check in|checking in|how are you/.test(lower)) return { subject: "Checking in", body: `${hello} Was just thinking about you. How's your week going? Miss you!${sign}` };
  if (/move|reschedule|another time/.test(lower)) {
    return {
      subject: "Can we find another time?",
      body: `${hello}\n\nSomething came up and I need to move our meeting. Would Monday afternoon or Tuesday after 2 work for you? Happy to work around your schedule.${sign}`,
    };
  }
  if (/cancel|can't make it|cant make it/.test(lower)) return { subject: "Can't make it", body: `${hello} I'm so sorry, I can't make it after all. Can we do another time soon?${sign}` };

  const sentence = a ? a.charAt(0).toUpperCase() + a.slice(1) : "";
  return {
    subject: sentence.slice(0, 60) || "Quick note",
    body: kind === "email" ? `${hello}\n\n${sentence ? `${sentence}.` : ""} Let me know what you think.${sign}` : `${hello} ${sentence ? `${sentence}.` : ""}`.trim(),
  };
}

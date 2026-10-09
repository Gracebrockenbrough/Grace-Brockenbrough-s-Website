import type { ConnectedSource } from "@/types";

/** Integrations are simulated in this prototype; statuses say so honestly. */
export const mockSources: ConnectedSource[] = [
  { id: "src-gcal", name: "Google Calendar", kind: "calendar", status: "connected", enabled: true, detail: "Personal and school calendars" },
  { id: "src-gmail", name: "Gmail", kind: "email", status: "connected", enabled: true, detail: "School inbox" },
  { id: "src-canvas", name: "Canvas", kind: "canvas", status: "demo", enabled: true, detail: "Assignments and announcements" },
  { id: "src-groupme", name: "GroupMe", kind: "groupme", status: "demo", enabled: true, detail: "BUS 304 Team, Finance Club" },
  { id: "src-messages", name: "Messages", kind: "text", status: "demo", enabled: true, detail: "Only messages you share with ORBIT" },
];

export const SOURCE_KIND_LABEL: Record<string, string> = {
  email: "Email",
  calendar: "Calendar",
  syllabus: "Syllabus",
  groupme: "GroupMe",
  text: "Text message",
  canvas: "Canvas",
  manual: "Added by you",
  screenshot: "Screenshot",
  voice: "Voice capture",
  orbit: "ORBIT suggestion",
};

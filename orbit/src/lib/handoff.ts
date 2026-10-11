/**
 * Buttons that hand off to another app with everything filled in. ORBIT opens
 * the app; the user reviews and sends, books, or saves it themselves.
 */

const enc = encodeURIComponent;

export function gmailCompose({ to = "", subject = "", body = "" }: { to?: string; subject?: string; body?: string }): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(to)}&su=${enc(subject)}&body=${enc(body)}`;
}

export function smsLink(body: string, to = ""): string {
  return `sms:${to}?&body=${enc(body)}`;
}

export function mapsLink(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${enc(query)}`;
}

export function googleCalendarLink({ title, date, start, end, location }: { title: string; date: string; start?: string; end?: string; location?: string }): string {
  const d = date.replace(/-/g, "");
  const dates = start && end ? `${d}T${start.replace(":", "")}00/${d}T${end.replace(":", "")}00` : `${d}/${d}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${enc(title)}&dates=${dates}${location ? `&location=${enc(location)}` : ""}`;
}

/** Well-known places a task usually gets done. */
export const APP_LINKS: Record<string, { label: string; href: string }> = {
  gmail: { label: "Gmail", href: "https://mail.google.com" },
  canvas: { label: "Canvas", href: "https://canvas.instructure.com" },
  groupme: { label: "GroupMe", href: "https://web.groupme.com" },
  linkedin: { label: "LinkedIn", href: "https://www.linkedin.com" },
  handshake: { label: "Handshake", href: "https://joinhandshake.com" },
  strava: { label: "Strava", href: "https://www.strava.com" },
  calendar: { label: "Google Calendar", href: "https://calendar.google.com" },
  maps: { label: "Maps", href: "https://www.google.com/maps" },
};

/** The app a task most likely lives in, if any. */
export function appFor(text: string, sourceKind?: string): { label: string; href: string } | undefined {
  const t = text.toLowerCase();
  if (/linkedin|alumni|network/.test(t)) return APP_LINKS.linkedin;
  if (/application|apply|internship|analyst|recruit/.test(t)) return APP_LINKS.handshake;
  if (/\brun\b|race|5k|10k/.test(t)) return APP_LINKS.strava;
  if (sourceKind === "canvas" || /reading|problem set|assignment|quiz|essay|paper/.test(t)) return APP_LINKS.canvas;
  if (sourceKind === "groupme") return APP_LINKS.groupme;
  if (sourceKind === "email") return APP_LINKS.gmail;
  return undefined;
}

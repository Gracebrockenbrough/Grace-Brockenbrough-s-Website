import type { BuiltinArea, Category } from "@/types";

/**
 * Parts of life. Each has a muted color used as a small dot, a thin border,
 * or a light tint — never as a big colored block. Users can add their own
 * areas ("custom:Wedding"); those behave exactly like built-in ones.
 */
export const BUILTIN_AREAS: BuiltinArea[] = ["school", "work", "career", "family", "social", "health", "money", "travel", "home", "personal"];

const LABEL: Record<BuiltinArea, string> = {
  school: "School",
  work: "Work",
  career: "Career",
  family: "Family",
  social: "Social",
  health: "Health",
  money: "Money",
  travel: "Travel",
  home: "Home",
  personal: "Personal",
};

const BLURB: Record<BuiltinArea, string> = {
  school: "Classes, exams, and assignments",
  work: "Meetings, shifts, and projects",
  career: "Applications, recruiting, and next steps",
  family: "Kids, parents, and family plans",
  social: "Friends and plans",
  health: "Workouts, sleep, and appointments",
  money: "Bills, budgets, and refunds",
  travel: "Trips and getting home",
  home: "Errands, repairs, and the household",
  personal: "Everything else",
};

/** Class strings are written out in full so Tailwind can see them. */
const STYLE: Record<BuiltinArea | "custom", { hex: string; dot: string; text: string; border: string; soft: string }> = {
  school: { hex: "#e0866e", dot: "bg-school", text: "text-school", border: "border-school", soft: "bg-school/10" },
  work: { hex: "#6f9bd8", dot: "bg-work", text: "text-work", border: "border-work", soft: "bg-work/10" },
  career: { hex: "#a28fe0", dot: "bg-career", text: "text-career", border: "border-career", soft: "bg-career/10" },
  family: { hex: "#a86f9a", dot: "bg-family", text: "text-family", border: "border-family", soft: "bg-family/10" },
  social: { hex: "#d9ae4f", dot: "bg-social-area", text: "text-social-area", border: "border-social-area", soft: "bg-social-area/10" },
  health: { hex: "#5fbf9f", dot: "bg-health", text: "text-health", border: "border-health", soft: "bg-health/10" },
  money: { hex: "#8db36a", dot: "bg-money", text: "text-money", border: "border-money", soft: "bg-money/10" },
  travel: { hex: "#7fb3d9", dot: "bg-travel", text: "text-travel", border: "border-travel", soft: "bg-travel/10" },
  home: { hex: "#c69a6d", dot: "bg-home", text: "text-home", border: "border-home", soft: "bg-home/10" },
  personal: { hex: "#d4849f", dot: "bg-personal-area", text: "text-personal-area", border: "border-personal-area", soft: "bg-personal-area/10" },
  custom: { hex: "#7fa8a8", dot: "bg-custom", text: "text-custom", border: "border-custom", soft: "bg-custom/10" },
};

export const isCustom = (a: string): a is `custom:${string}` => a.startsWith("custom:");
export const isArea = (v: string): v is Category => (BUILTIN_AREAS as string[]).includes(v) || (isCustom(v) && v.length > 7);

export function areaLabel(a: Category): string {
  return isCustom(a) ? a.slice(7) : LABEL[a];
}
export function areaBlurb(a: Category): string {
  return isCustom(a) ? "Your own area" : BLURB[a];
}
export function areaStyle(a: Category) {
  return isCustom(a) ? STYLE.custom : STYLE[a];
}
/** URL-safe slug for /orbit/[area]. */
export const areaSlug = (a: Category) => encodeURIComponent(a);
export const customArea = (label: string): Category => `custom:${label.trim()}`;

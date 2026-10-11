import type { Category } from "@/types";

/** The parts of life ORBIT organizes around. Shown to people with these names. */
export const AREA_LABEL: Record<Category, string> = {
  school: "School",
  work: "Career",
  wellness: "Wellness",
  social: "Social",
  travel: "Travel",
  personal: "Personal",
};

export const AREA_ORDER: Category[] = ["school", "work", "wellness", "social", "travel", "personal"];

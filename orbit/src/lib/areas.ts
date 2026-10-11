import { Briefcase, GraduationCap, Heart, Leaf, Plane, Sparkles } from "lucide-react";
import type { Category } from "@/types";

export const AREA_LABEL: Record<Category, string> = { school: "School", work: "Career", wellness: "Wellness", social: "Social", travel: "Travel", personal: "Personal" };
export const AREA_ORDER: Category[] = ["school", "work", "wellness", "social", "travel", "personal"];

/**
 * Each part of life is a planet with its own color. Class strings are written
 * out in full so Tailwind can see them.
 */
export const AREA_STYLE: Record<Category, { hex: string; dot: string; text: string; border: string; soft: string; ring: string; icon: typeof Leaf; blurb: string }> = {
  school: { hex: "#f08a6e", dot: "bg-school", text: "text-school", border: "border-school", soft: "bg-school/15", ring: "ring-school", icon: GraduationCap, blurb: "Classes, exams, and assignments" },
  work: { hex: "#b9a6ff", dot: "bg-career", text: "text-career", border: "border-career", soft: "bg-career/15", ring: "ring-career", icon: Briefcase, blurb: "Applications, recruiting, and jobs" },
  wellness: { hex: "#6fd3c1", dot: "bg-wellness", text: "text-wellness", border: "border-wellness", soft: "bg-wellness/15", ring: "ring-wellness", icon: Leaf, blurb: "Runs, sleep, and appointments" },
  social: { hex: "#f2c46d", dot: "bg-social-area", text: "text-social-area", border: "border-social-area", soft: "bg-social-area/15", ring: "ring-social-area", icon: Heart, blurb: "Friends, family, and plans" },
  travel: { hex: "#7ec3f7", dot: "bg-travel", text: "text-travel", border: "border-travel", soft: "bg-travel/15", ring: "ring-travel", icon: Plane, blurb: "Trips, flights, and getting home" },
  personal: { hex: "#f59bb9", dot: "bg-personal-area", text: "text-personal-area", border: "border-personal-area", soft: "bg-personal-area/15", ring: "ring-personal-area", icon: Sparkles, blurb: "Errands, money, and everything else" },
};

export const isArea = (v: string): v is Category => (AREA_ORDER as string[]).includes(v);

"use client";

import type { ReactNode } from "react";
import { webDriver } from "@/store/webDriver";
import { AppRoot } from "./AppRoot";

export function WebAppRoot({ children }: { children: ReactNode }) {
  return <AppRoot driver={webDriver}>{children}</AppRoot>;
}

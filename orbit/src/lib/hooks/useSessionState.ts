"use client";

import { useEffect, useState } from "react";

/** useState that survives tab switches within a visit (sessionStorage), and works without it. */
export function useSessionState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(`orbit:ui:${key}`) : null;
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.sessionStorage.setItem(`orbit:ui:${key}`, JSON.stringify(value));
    } catch {
      // Storage blocked: state still works for this view.
    }
  }, [key, value]);
  return [value, setValue];
}

/** Sets a session value before navigating, e.g. to open Returns on its Refunds filter. */
export function presetSession<T>(key: string, value: T) {
  try {
    window.sessionStorage.setItem(`orbit:ui:${key}`, JSON.stringify(value));
  } catch {
    // Ignore: the destination opens on its default.
  }
}

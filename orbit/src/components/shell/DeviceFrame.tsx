"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun as SunIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOrbit } from "@/store/OrbitProvider";
import { Logo } from "./Logo";

/** Applies the chosen theme (or follows the system). */
function useTheme(): "light" | "dark" {
  const { state } = useOrbit();
  const theme = state.displayPrefs.theme ?? "system";
  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);
  return theme === "system" ? (systemDark ? "dark" : "light") : theme;
}

const POINTS = [
  { title: "Notices changes", body: "A deadline moved. A meeting changed. Something new came up." },
  { title: "Connects the dots", body: "Orbit understands what that change affects elsewhere." },
  { title: "Helps you act", body: "It prepares the next step. Nothing changes until you approve it." },
];

/**
 * Orbit is a phone app. On a phone it fills the screen. On a wide screen it
 * sits inside a phone frame, with a short product story beside it. The
 * transformed screen makes `position: fixed` (tab bar, sheets, toasts) stay
 * inside the phone.
 */
export function DeviceFrame({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const { state, derived, dispatch } = useOrbit();
  const h = derived.now.getHours();
  // Shown only after mount: the server's clock and time zone differ from the viewer's.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const clock = mounted ? `${h % 12 || 12}:${String(derived.now.getMinutes()).padStart(2, "0")}` : "";
  const pathname = usePathname();
  const scroller = useRef<HTMLDivElement>(null);

  // A new screen starts at the top, as it would in an app.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="[--app-h:100dvh] lg:flex lg:h-dvh lg:items-center lg:justify-center lg:gap-[clamp(32px,6vw,96px)] lg:overflow-hidden lg:px-10 lg:[--app-h:100%]">
      <aside className="hidden max-w-[460px] flex-1 lg:block" aria-label="About Orbit">
        <Logo size="lg" />
        <p className="font-display mt-10 text-[46px] leading-[1.08] xl:text-[54px]">Your life, without the mental juggling.</p>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
          Orbit keeps track of what matters, notices when something changes, and helps you figure out what to do next.
        </p>
        <ol className="mt-10 space-y-6">
          {POINTS.map((p, i) => (
            <li key={p.title} className="flex gap-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-strong text-[13px] text-ink-2">{i + 1}</span>
              <span>
                <span className="block text-[16px] font-semibold">{p.title}</span>
                <span className="block text-[15px] text-ink-2">{p.body}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-ink-3">
          <div role="group" aria-label="Theme" className="inline-flex rounded-full border border-line p-0.5">
            {(["light", "dark"] as const).map((t) => {
              const on = theme === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => dispatch({ type: "SET_DISPLAY_PREF", patch: { theme: t } })}
                  className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[13.5px]", on ? "bg-sunken text-ink" : "text-ink-3 hover:text-ink")}
                >
                  {t === "light" ? <SunIcon size={14} aria-hidden /> : <Moon size={14} aria-hidden />}
                  {t === "light" ? "Light" : "Dark"}
                </button>
              );
            })}
          </div>
          {state.mode === "demo" ? (
            <span>Sample data · Fri, Oct 9</span>
          ) : (
            <span>{state.onboarded ? "Your Orbit" : "Interactive · your own data"}</span>
          )}
        </div>
      </aside>

      <div className="lg:shrink-0 lg:rounded-[58px] lg:bg-[#05070f] lg:p-[11px] lg:shadow-[0_40px_80px_-20px_rgba(10,16,40,0.45),inset_0_0_0_1.5px_#2a2f40]">
        <div className="lg:relative lg:flex lg:aspect-[390/844] lg:h-[min(844px,calc(100dvh-56px))] lg:flex-col lg:overflow-hidden lg:rounded-[47px] lg:bg-canvas lg:[transform:translateZ(0)]">
          {/* Status bar (frame only) */}
          <div className="hidden h-11 shrink-0 items-center justify-between px-8 pt-1 text-[14px] font-semibold lg:flex" aria-hidden>
            <span>{clock}</span>
            <span className="absolute left-1/2 top-2.5 h-[30px] w-[104px] -translate-x-1/2 rounded-full bg-black" />
            <span className="flex items-center gap-1.5">
              <span className="flex items-end gap-[2px]">{[5, 7, 9, 11].map((h) => <span key={h} className="w-[3px] rounded-sm bg-ink" style={{ height: h }} />)}</span>
              <span className="ml-1 h-[11px] w-[22px] rounded-[3px] border border-ink/50 p-[1.5px]"><span className="block h-full w-3/4 rounded-[1.5px] bg-ink" /></span>
            </span>
          </div>
          <div ref={scroller} id="app-scroll" className="lg:no-scrollbar lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
            {children}
          </div>
          <span className="pointer-events-none absolute bottom-2 left-1/2 z-[80] hidden h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-ink/80 lg:block" aria-hidden />
        </div>
      </div>
    </div>
  );
}

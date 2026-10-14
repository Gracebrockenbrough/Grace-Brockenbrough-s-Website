// Entry for the Claude-link build: the whole app as one page, signed in with Claude.
import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import { AppRoot } from "@/components/shell/AppRoot";
import { AppShell } from "@/components/shell/AppShell";
import { claudeDriver } from "@/store/backends/claude";
import Home from "@/app/page";
import NotFound from "@/app/not-found";
import OnboardingPage from "@/app/onboarding/page";
import TodayPage from "@/app/(app)/today/page";
import CalendarPage from "@/app/(app)/calendar/page";
import CoursesPage from "@/app/(app)/courses/page";
import CoursePage from "@/app/(app)/courses/[id]/page";
import UploadPage from "@/app/(app)/courses/upload/page";
import LoopsPage from "@/app/(app)/loops/page";
import AskPage from "@/app/(app)/ask/page";
import OrbitPage from "@/app/(app)/orbit/page";
import AreaPage from "@/app/(app)/orbit/[area]/page";
import SettingsPage from "@/app/(app)/settings/page";
import ConnectionsPage from "@/app/(app)/settings/connections/page";
import { usePathname } from "./navigation";

// Pre-resolved params so React's use() doesn't suspend.
const paramCache = new Map<string, Promise<Record<string, string>>>();
function paramsFor<T extends Record<string, string>>(value: T): Promise<T> {
  const key = JSON.stringify(value);
  let p = paramCache.get(key);
  if (!p) {
    p = Promise.resolve(value);
    Object.assign(p, { status: "fulfilled", value });
    paramCache.set(key, p);
  }
  return p as Promise<T>;
}

const APP_PAGES: Record<string, () => React.JSX.Element | null> = {
  "/today": TodayPage,
  "/calendar": CalendarPage,
  "/courses": CoursesPage,
  "/courses/upload": UploadPage,
  "/loops": LoopsPage,
  "/ask": AskPage,
  "/orbit": OrbitPage,
  "/settings": SettingsPage,
  "/settings/connections": ConnectionsPage,
};

function Router() {
  const path = usePathname();
  useEffect(() => {
    document.title = "Orbit";
  }, []);
  if (path === "/") return <Home />;
  if (path === "/onboarding") return <OnboardingPage />;
  const Page = APP_PAGES[path];
  const course = path.match(/^\/courses\/([^/]+)$/);
  const area = path.match(/^\/orbit\/([^/]+)$/);
  if (!Page && !course && !area) return <NotFound />;
  return (
    <AppShell>
      {Page ? <Page /> : course ? <CoursePage key={course[1]} params={paramsFor({ id: course[1] })} /> : <AreaPage key={area![1]} params={paramsFor({ area: area![1] })} />}
    </AppShell>
  );
}

createRoot(document.getElementById("orbit-root")!).render(
  <AppRoot driver={claudeDriver}>
    <Router />
  </AppRoot>,
);

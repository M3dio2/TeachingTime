"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useSyncExternalStore } from "react";
import LoadingScreen from "@/components/room/LoadingScreen";
import SubmitButton from "@/components/ui/SubmitButton";
import { useLocale, useT } from "@/lib/i18n/client";

// Re-fetches the dashboard every 10 s so "Waiting" badges appear without reloading, and at
// once when the tab comes back to the front (browsers slow down timers in background tabs).
// No checks while the tab is hidden.
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    const onShow = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, [router, seconds]);
  return null;
}

// Formats a date in the viewer's own time zone (the server runs in UTC).
export function LocalDate({ iso }: { iso: string }) {
  const locale = useLocale();
  const date = new Date(iso);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {date.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })}
    </time>
  );
}

// Submit button that asks first, with a pending state.
export function ConfirmSubmit({
  message,
  pending,
  children,
}: {
  message: string;
  pending: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <SubmitButton variant="ghost" size="sm" confirm={message} confirmLabel={t.common.endCall} pending={pending}>
      {children}
    </SubmitButton>
  );
}

// D5d: back from a lesson, "Leaving the lesson" stays until the classrooms are shown; any other
// time the dashboard's wait says "Loading your classrooms". TeacherRoom sets the flag.
const LEAVING_KEY = "leaving-lesson";
export function markLeavingLesson() {
  try {
    sessionStorage.setItem(LEAVING_KEY, "1");
  } catch {}
}
const noop = () => () => {};
export function DashboardLoading() {
  const t = useT();
  const leaving = useSyncExternalStore(
    noop,
    () => {
      try {
        return sessionStorage.getItem(LEAVING_KEY) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
  return <LoadingScreen title={leaving ? t.dashboard.leavingLesson : t.dashboard.loadingClassrooms} />;
}
// Rendered with the classrooms: the wait is over.
export function DoneLeaving() {
  useEffect(() => {
    try {
      sessionStorage.removeItem(LEAVING_KEY);
    } catch {}
  }, []);
  return null;
}

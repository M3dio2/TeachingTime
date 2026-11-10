"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useSyncExternalStore } from "react";
import LoadingScreen from "@/components/room/LoadingScreen";
import SubmitButton from "@/components/ui/SubmitButton";

// Re-fetches the dashboard every 15 s so "Waiting" badges appear without reloading.
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}

// Formats a date in the viewer's own time zone (the server runs in UTC).
export function LocalDate({ iso }: { iso: string }) {
  const date = new Date(iso);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
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
  return (
    <SubmitButton variant="ghost" size="sm" confirm={message} pending={pending}>
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
  return <LoadingScreen title={leaving ? "Leaving the lesson" : "Loading your classrooms"} />;
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

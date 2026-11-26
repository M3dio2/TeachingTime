import Link from "next/link";
import type { Messages } from "@/lib/i18n/messages";

// The teacher's pages (mock-up 1): Classrooms (the dashboard), Calendar, Library.
export default function PageTabs({
  t,
  current,
}: {
  t: Messages["calendar"];
  current: "classrooms" | "calendar" | "library";
}) {
  const tabs = [
    { id: "classrooms", href: "/dashboard", label: t.tabClassrooms },
    { id: "calendar", href: "/dashboard/calendar", label: t.tabCalendar },
  ] as const;
  return (
    <nav aria-label={t.tabs} className="mx-auto w-full max-w-[1240px] px-[clamp(16px,4vw,32px)]">
      <ul className="flex gap-1 border-b border-line">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <Link
              href={tab.href}
              aria-current={tab.id === current ? "page" : undefined}
              className={`-mb-px inline-flex h-11 items-center border-b-2 px-3.5 font-semibold focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                tab.id === current ? "border-ink text-ink" : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

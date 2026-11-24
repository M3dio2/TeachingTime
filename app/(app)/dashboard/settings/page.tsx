import type { Metadata } from "next";
import { BackToClassrooms } from "@/components/classroom/ClassroomBits";
import CloudSettings from "@/components/cloud/CloudSettings";
import Wordmark from "@/components/ui/Wordmark";

// Private: never listed by search engines.
export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };

// C1: the teacher's settings (for now: her clouds). Everything here lives in her browser.
export default function SettingsPage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-4 px-[clamp(16px,4vw,32px)] py-5">
        <Wordmark underline="still" />
        <BackToClassrooms />
      </header>
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-[clamp(16px,4vw,32px)] pt-3 pb-24">
        <CloudSettings />
      </main>
    </div>
  );
}

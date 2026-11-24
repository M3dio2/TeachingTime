import type { Metadata } from "next";
import DropboxReturn from "@/components/cloud/DropboxReturn";

export const metadata: Metadata = { title: "Dropbox", robots: { index: false, follow: false } };

// C1: Dropbox sends the teacher back here after she allowed TeachingTime (lib/cloud/dropbox.ts).
export default function DropboxPage() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center p-6">
      <DropboxReturn />
    </main>
  );
}

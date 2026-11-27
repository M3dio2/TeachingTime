import type { Metadata } from "next";
import { Suspense } from "react";
import { StorageCard } from "@/components/classroom/FileUpload";
import { DashboardLoading } from "@/components/dashboard/DashboardBits";
import { FeedbackButton, LanguageMenu, NameChip } from "@/components/dashboard/DashboardMenus";
import PageTabs from "@/components/dashboard/PageTabs";
import LibraryFiles, { type LibraryFile } from "@/components/library/LibraryFiles";
import Wordmark from "@/components/ui/Wordmark";
import { LIBRARY_MAX_BYTES, MB } from "@/lib/files/uploadResource";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

// Private: never listed by search engines.
export const metadata: Metadata = { title: "Library", robots: { index: false, follow: false } };

// The Library (docs/PLAN-calendar-library-slides.md, mock-up 8): files for several students.
export default function LibraryPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <Library />
    </Suspense>
  );
}

async function Library() {
  const [supabase, { calendar: tc, library: t }] = await Promise.all([createClient(), getT()]);
  const [{ data: auth }, { data: rows }, { data: rooms }, { data: links }, { data: usedBytes }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("resources")
      .select("*")
      .eq("in_library", true)
      .order("created_at", { ascending: false }),
    supabase.from("lessons").select("id, title").eq("kind", "student").order("title"),
    supabase.from("resource_classrooms").select("resource_id, lesson_id"),
    supabase.rpc("resources_used_bytes"),
  ]);
  // Folders (0021); before that migration: none.
  const { data: folderRows } = await supabase.from("library_folders").select("id, name").order("name");
  const files = (rows ?? []) as { id: string; kind: LibraryFile["kind"]; name: string; path: string | null; size: number; created_at: string; all_classrooms: boolean; folder_id?: string | null }[];
  const stored = files.filter((f) => f.path);
  const { data: signed } = stored.length
    ? await supabase.storage.from("resources").createSignedUrls(
        stored.map((f) => f.path!),
        60 * 60,
      )
    : { data: [] };
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const byFile = new Map<string, string[]>();
  for (const l of links ?? []) byFile.set(l.resource_id, [...(byFile.get(l.resource_id) ?? []), l.lesson_id]);
  const teacherName: string = auth.user?.user_metadata.display_name ?? "";

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-4 px-[clamp(16px,4vw,32px)] py-5">
        <Wordmark underline="still" />
        <div className="flex items-center gap-2">
          <LanguageMenu />
          <FeedbackButton />
          <NameChip name={teacherName} />
        </div>
      </header>
      <PageTabs t={tc} current="library" />
      <main className="mx-auto grid w-full max-w-[1240px] items-start gap-6 px-[clamp(16px,4vw,32px)] pt-6 pb-16 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[30px] leading-[1.1] tracking-[-0.02em] md:text-4xl">{t.title}</h1>
            <p className="max-w-[640px] text-ink-muted">{t.intro(LIBRARY_MAX_BYTES / MB)}</p>
          </div>
          <LibraryFiles
            teacherId={auth.user?.id ?? ""}
            usedBytes={Number(usedBytes ?? 0)}
            classrooms={(rooms ?? []).map((r) => ({ id: r.id as string, title: r.title as string }))}
            files={files.map((f) => ({
              id: f.id,
              kind: f.kind,
              name: f.name,
              size: f.size,
              created_at: f.created_at,
              url: (f.path && urls.get(f.path)) || undefined,
              all: f.all_classrooms,
              lessonIds: byFile.get(f.id) ?? [],
              folderId: f.folder_id ?? null,
            }))}
            folders={(folderRows ?? []) as { id: string; name: string }[]}
          />
        </div>
        <aside className="lg:sticky lg:top-4">
          <StorageCard usedBytes={Number(usedBytes ?? 0)} />
        </aside>
      </main>
    </div>
  );
}

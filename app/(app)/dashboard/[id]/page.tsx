import { ArrowLeft, Video } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import CopyLinkButton from "@/components/CopyLinkButton";
import { LinkField, RemoveButton } from "@/components/classroom/ClassroomBits";
import ClassroomFiles, { type Resource } from "@/components/classroom/ClassroomFiles";
import { StorageCard } from "@/components/classroom/FileUpload";
import { LocalDate } from "@/components/dashboard/DashboardBits";
import { buttonClass } from "@/components/ui/Button";
import Wordmark from "@/components/ui/Wordmark";
import { createClient } from "@/lib/supabase/server";
import { removeLesson } from "../actions";

// Private: never listed by search engines.
export const metadata: Metadata = { title: "Classroom", robots: { index: false, follow: false } };

// A student's classroom (docs/design/HANDOFF.md, "Classroom"): the student, their link and
// Start lesson on the left with the storage card and Remove; the files on the right.
export default function ClassroomPage({ params }: PageProps<"/dashboard/[id]">) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-4 px-[clamp(16px,4vw,32px)] py-5">
        <Wordmark underline="still" />
        <Link href="/dashboard" className={buttonClass("ghost", "sm", "h-9 text-ink!")}>
          <ArrowLeft size={16} aria-hidden />
          Your classrooms
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-[1120px] flex-wrap items-start gap-6 px-[clamp(16px,4vw,32px)] pt-3 pb-16">
        <Suspense fallback={<p className="text-ink-muted">Loading…</p>}>
          <Classroom params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function Classroom({ params }: Pick<PageProps<"/dashboard/[id]">, "params">) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: auth }, { data: student }, { data: files }, { data: usedBytes }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("lessons")
      .select("id, title, invite_slug, last_active_at")
      .eq("id", id)
      .eq("kind", "student")
      .maybeSingle(),
    supabase
      .from("resources")
      .select("id, kind, name, path, url, size, created_at")
      .eq("lesson_id", id)
      .order("created_at", { ascending: false }),
    supabase.rpc("resources_used_bytes"),
  ]);
  if (!student || !auth.user) notFound();

  const resources = (files ?? []) as (Omit<Resource, "url"> & { path: string | null; url: string | null })[];
  // "Open" links and picture previews for the teacher, valid for an hour. Links have no file:
  // their url is the link itself.
  const stored = resources.filter((r) => r.path);
  const { data: signed } = stored.length
    ? await supabase.storage.from("resources").createSignedUrls(
        stored.map((r) => r.path!),
        60 * 60,
      )
    : { data: [] };
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  for (const r of resources) r.url = r.path ? (urls.get(r.path) ?? null) : r.url;

  return (
    <>
      <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 md:max-w-[380px]">
        <section className="flex flex-col gap-[18px] rounded-panel border border-line bg-surface p-5">
          <div className="flex items-center gap-3.5">
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-2xl font-extrabold text-accent">
              {student.title.charAt(0).toUpperCase()}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <h1 className="truncate text-[32px] leading-[1.1] tracking-[-0.02em]">{student.title}</h1>
              <span className="text-sm text-ink-muted">
                {student.last_active_at ? (
                  <>
                    Last lesson: <LocalDate iso={student.last_active_at} />
                  </>
                ) : (
                  "No lessons yet"
                )}
              </span>
            </div>
          </div>
          <Link href={`/lesson/${student.id}`} className={buttonClass("primary", "md", "h-11 font-semibold")}>
            <Video size={16} aria-hidden />
            Start lesson
          </Link>
          <StudentLink slug={student.invite_slug} name={student.title} />
        </section>
        <StorageCard usedBytes={Number(usedBytes ?? 0)} />
        <RemoveClassroom id={student.id} name={student.title} className="hidden md:flex" />
      </aside>
      <ClassroomFiles
        files={resources.map((r) => ({ id: r.id, kind: r.kind, name: r.name, size: r.size, created_at: r.created_at, url: r.url ?? undefined }))}
        teacherId={auth.user.id}
        lessonId={student.id}
        usedBytes={Number(usedBytes ?? 0)}
      />
      {/* Phones: Remove sits at the very end of the page, after the files. */}
      <RemoveClassroom id={student.id} name={student.title} className="flex md:hidden" />
    </>
  );
}

function RemoveClassroom({ id, name, className }: { id: string; name: string; className: string }) {
  return (
    <form action={removeLesson} className={`flex-col gap-1 px-1 ${className}`}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="then" value="dashboard" />
      <RemoveButton name={name} />
      <span className="text-[13px] text-ink-muted">The link stops working and the files are deleted.</span>
    </form>
  );
}

// The student link in a read-only field with Copy. The host is read on the client.
function StudentLink({ slug, name }: { slug: string; name: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{name}&apos;s link</span>
      <div className="flex gap-2">
        <LinkField slug={slug} label={`${name}'s link`} />
        <CopyLinkButton slug={slug} label="Copy" />
      </div>
      <span className="text-[13px] text-ink-muted">{name} joins with this link. It stays the same every week.</span>
    </div>
  );
}

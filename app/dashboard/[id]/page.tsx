import { FileText, ImageIcon, Music, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import CopyLinkButton from "@/components/CopyLinkButton";
import FileUpload, { type ResourceKind } from "@/components/classroom/FileUpload";
import { ConfirmSubmit, LocalDate } from "@/components/dashboard/DashboardBits";
import { buttonClass } from "@/components/ui/Button";
import Wordmark from "@/components/ui/Wordmark";
import { createClient } from "@/lib/supabase/server";
import { removeResource } from "../actions";

// A student's classroom: their link, Start lesson, and the teacher's files for them.
export default function ClassroomPage({ params }: PageProps<"/dashboard/[id]">) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col gap-8 p-4 sm:p-8">
      <header className="flex items-center justify-between">
        <Wordmark underline="still" />
        <Link href="/dashboard" className={buttonClass("ghost", "sm")}>
          ← Your classrooms
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <Suspense fallback={<p className="text-ink-muted">Loading…</p>}>
          <Classroom params={params} />
        </Suspense>
      </div>
    </main>
  );
}

type Resource = {
  id: string;
  kind: ResourceKind;
  name: string;
  path: string;
  size: number;
  created_at: string;
  url?: string;
};

// The three file sections, in page order.
const sections: { kind: ResourceKind; title: string; Icon: LucideIcon; empty: string }[] = [
  { kind: "image", title: "Pictures", Icon: ImageIcon, empty: "No pictures yet." },
  { kind: "pdf", title: "PDFs", Icon: FileText, empty: "No PDFs yet." },
  { kind: "audio", title: "Audio", Icon: Music, empty: "No audio yet." },
];

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
      .select("id, kind, name, path, size, created_at")
      .eq("lesson_id", id)
      .order("created_at", { ascending: false }),
    supabase.rpc("resources_used_bytes"),
  ]);
  if (!student || !auth.user) notFound();

  const resources = (files ?? []) as Resource[];
  // "Open" links and picture previews for the teacher, valid for an hour.
  const { data: signed } = resources.length
    ? await supabase.storage.from("resources").createSignedUrls(
        resources.map((r) => r.path),
        60 * 60,
      )
    : { data: [] };
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  for (const r of resources) r.url = urls.get(r.path) ?? undefined;

  return (
    <>
      <section className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-4">
        <div>
          <h1 className="text-2xl">{student.title}</h1>
          <p className="text-sm text-ink-muted">
            {student.last_active_at ? (
              <>
                Last lesson: <LocalDate iso={student.last_active_at} />
              </>
            ) : (
              "No lessons yet"
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/lesson/${student.id}`} className={buttonClass("primary", "md")}>
            Start lesson
          </Link>
          <CopyLinkButton slug={student.invite_slug} />
        </div>
        <p className="text-sm text-ink-muted">
          {student.title} joins with the student link. It stays the same every week.
        </p>
      </section>

      <section
        aria-labelledby="files"
        className="flex flex-col gap-5 rounded-panel border border-line bg-surface p-4"
      >
        <div className="flex flex-col gap-3">
          <h2 id="files" className="text-xl font-semibold">
            Files
          </h2>
          <FileUpload teacherId={auth.user.id} lessonId={student.id} usedBytes={Number(usedBytes ?? 0)} />
        </div>

        {sections.map(({ kind, title, Icon, empty }) => {
          const list = resources.filter((r) => r.kind === kind);
          return (
            <div key={kind} className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-accent">
                  <Icon size={16} aria-hidden />
                </span>
                <h3 className="font-semibold">{title}</h3>
                {list.length > 0 && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-muted">
                    {list.length}
                  </span>
                )}
              </div>
              {list.length === 0 ? (
                <p className="text-sm text-ink-muted">{empty}</p>
              ) : (
                <FileList files={list} Icon={Icon} />
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}

function FileList({ files, Icon }: { files: Resource[]; Icon: LucideIcon }) {
  return (
    <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
      {files.map((file) => (
        <li key={file.id} className="flex items-center gap-3 px-3 py-2.5">
          {file.kind === "image" && file.url ? (
            // Signed URLs change on every load, so Next's image optimizer wouldn't help.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.url}
              alt=""
              loading="lazy"
              className="size-10 shrink-0 rounded-md border border-line bg-surface-2 object-cover"
            />
          ) : (
            <Icon size={16} aria-hidden className="shrink-0 text-ink-muted" />
          )}
          <div className="min-w-0 flex-1">
            {file.url ? (
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="block truncate font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {file.name}
              </a>
            ) : (
              <p className="truncate font-medium">{file.name}</p>
            )}
            <p className="text-sm text-ink-muted">
              {formatSize(file.size)} · <LocalDate iso={file.created_at} />
            </p>
          </div>
          <DeleteFile file={file} />
        </li>
      ))}
    </ul>
  );
}

function DeleteFile({ file }: { file: Resource }) {
  return (
    <form action={removeResource}>
      <input type="hidden" name="id" value={file.id} />
      <ConfirmSubmit message={`Delete ${file.name}?`}>Delete</ConfirmSubmit>
    </form>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

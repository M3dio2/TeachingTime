import { notFound } from "next/navigation";
import { Suspense } from "react";
import LoadingScreen from "@/components/room/LoadingScreen";
import type { RoomFile } from "@/components/room/FilesPanel";
import TeacherRoom from "@/components/room/TeacherRoom";
import { createClient } from "@/lib/supabase/server";
import { isWithin } from "@/lib/time";

// After this long without activity, the next start is a new lesson with a clean board.
const NEW_LESSON_AFTER_MS = 3 * 60 * 60 * 1000;

export default function LessonPage({ params }: PageProps<"/lesson/[id]">) {
  return (
    <Suspense fallback={<LoadingScreen title="Getting your lesson ready" />}>
      <Lesson params={params} />
    </Suspense>
  );
}

async function Lesson({ params }: Pick<PageProps<"/lesson/[id]">, "params">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, doc_snapshot, invite_slug, kind, last_active_at")
    .eq("id", id)
    .maybeSingle();
  if (!lesson) notFound();
  const files = lesson.kind === "student" ? await loadFiles(supabase, lesson.id) : undefined;

  // Read-only on purpose (links may be prefetched); last_active_at is written by the
  // token route when the teacher actually joins, and by every save.
  const sameLesson = isWithin(lesson.last_active_at, NEW_LESSON_AFTER_MS);

  return (
    <TeacherRoom
      lesson={{
        id: lesson.id,
        title: lesson.title,
        files,
        inviteSlug: lesson.invite_slug,
        snapshot: sameLesson ? lesson.doc_snapshot : null,
        saveBoard: lesson.kind === "student",
      }}
    />
  );
}

// The classroom's files for the room's files panel (student lessons only). Pictures get a
// signed preview URL for the length of a lesson; opening files comes in L2a.
async function loadFiles(supabase: Awaited<ReturnType<typeof createClient>>, lessonId: string) {
  const { data } = await supabase
    .from("resources")
    .select("id, kind, name, path")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as { id: string; kind: RoomFile["kind"]; name: string; path: string }[];
  const pictures = rows.filter((r) => r.kind === "image");
  const { data: signed } = pictures.length
    ? await supabase.storage.from("resources").createSignedUrls(
        pictures.map((r) => r.path),
        4 * 60 * 60,
      )
    : { data: [] };
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return rows.map(
    (r): RoomFile => ({ id: r.id, kind: r.kind, name: r.name, previewUrl: urls.get(r.path) ?? undefined }),
  );
}

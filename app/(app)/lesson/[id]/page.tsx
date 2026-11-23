import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import LoadingScreen from "@/components/room/LoadingScreen";
import type { RoomFile } from "@/components/room/FilesPanel";
import TeacherRoom from "@/components/room/TeacherRoom";
import { cleanQuestions, playable } from "@/lib/quiz";
import { createClient } from "@/lib/supabase/server";
import { isWithin } from "@/lib/time";

// Private: never listed by search engines.
export const metadata: Metadata = { title: "Lesson", robots: { index: false, follow: false } };

// After this long without activity, the next start is a new lesson with a clean board.
const NEW_LESSON_AFTER_MS = 3 * 60 * 60 * 1000;

export default function LessonPage({ params }: PageProps<"/lesson/[id]">) {
  return (
    <Suspense fallback={<LoadingScreen />}>
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
  const files =
    lesson.kind === "student"
      ? [...(await loadFiles(supabase, lesson.id)), ...(await loadQuizzes(supabase, lesson.id))]
      : undefined;

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
    .select("id, kind, name, path, url")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as { id: string; kind: RoomFile["kind"]; name: string; path: string | null; url: string | null }[];
  const pictures = rows.filter((r) => r.kind === "image" && r.path);
  const { data: signed } = pictures.length
    ? await supabase.storage.from("resources").createSignedUrls(
        pictures.map((r) => r.path!),
        4 * 60 * 60,
      )
    : { data: [] };
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return rows.map(
    (r): RoomFile => ({
      id: r.id,
      kind: r.kind,
      name: r.name,
      previewUrl: r.path ? (urls.get(r.path) ?? undefined) : undefined,
      url: r.kind === "link" ? (r.url ?? undefined) : undefined,
    }),
  );
}

// Q1: the teacher's quizzes, listed in the files panel of every student lesson.
// Q1b: the quizzes added to this Classroom.
async function loadQuizzes(supabase: Awaited<ReturnType<typeof createClient>>, lessonId: string) {
  const { data } = await supabase
    .from("quizzes")
    .select("id, title, questions, quiz_classrooms!inner(lesson_id)")
    .eq("quiz_classrooms.lesson_id", lessonId)
    .order("title");
  // Only quizzes with at least one complete question (incomplete ones are drafts).
  return (data ?? [])
    .map((q) => ({ id: q.id, title: q.title, questions: cleanQuestions(q.questions) }))
    .filter((q) => playable(q.questions).length > 0)
    .map((quiz): RoomFile => ({ id: quiz.id, kind: "quiz", name: quiz.title, quiz }));
}

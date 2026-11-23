import { ListChecks, Plus, Trash2, Video, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import CopyLinkButton from "@/components/CopyLinkButton";
import { BackToClassrooms, ClassroomLoading, LinkField, RemoveButton } from "@/components/classroom/ClassroomBits";
import ClassroomFiles, { type Resource } from "@/components/classroom/ClassroomFiles";
import { StorageCard } from "@/components/classroom/FileUpload";
import { LocalDate } from "@/components/dashboard/DashboardBits";
import { buttonClass } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import SubmitButton from "@/components/ui/SubmitButton";
import Wordmark from "@/components/ui/Wordmark";
import { cleanQuestions, playable } from "@/lib/quiz";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n/messages";

type T = Messages["dashboard"];
import { removeLesson } from "../actions";
import { classroomQuizForm, createQuiz, removeQuizResult } from "../quiz/actions";

// Private: never listed by search engines.
export const metadata: Metadata = { title: "Classroom", robots: { index: false, follow: false } };

// A student's classroom (docs/design/HANDOFF.md, "Classroom"): the student, their link and
// Start lesson on the left with the storage card and Remove; the files on the right.
export default function ClassroomPage({ params }: PageProps<"/dashboard/[id]">) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-4 px-[clamp(16px,4vw,32px)] py-5">
        <Wordmark underline="still" />
        <BackToClassrooms />
      </header>
      <main className="mx-auto flex w-full max-w-[1120px] flex-wrap items-start gap-6 px-[clamp(16px,4vw,32px)] pt-3 pb-16">
        <Suspense fallback={<ClassroomLoading />}>
          <Classroom params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function Classroom({ params }: Pick<PageProps<"/dashboard/[id]">, "params">) {
  const { id } = await params;
  const [supabase, { dashboard: t, quiz: tq }] = await Promise.all([createClient(), getT()]);

  const [
    { data: auth },
    { data: student },
    { data: files },
    { data: usedBytes },
    { data: results },
    { data: allQuizzes },
    { data: links },
  ] = await Promise.all([
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
    supabase
      .from("quiz_results")
      .select("id, quiz_title, score, total, created_at")
      .eq("lesson_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("quizzes").select("id, title, questions").order("title"),
    supabase.from("quiz_classrooms").select("quiz_id").eq("lesson_id", id),
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
                    {t.lastLesson} <LocalDate iso={student.last_active_at} />
                  </>
                ) : (
                  t.noLessonsYet
                )}
              </span>
            </div>
          </div>
          <Link href={`/lesson/${student.id}`} className={buttonClass("primary", "md", "h-11 font-semibold")}>
            <Video size={16} aria-hidden />
            {t.startLesson}
          </Link>
          <StudentLink t={t} slug={student.invite_slug} name={student.title} />
        </section>
        <StorageCard usedBytes={Number(usedBytes ?? 0)} />
        <ClassroomQuizzes
          t={tq}
          lessonId={student.id}
          quizzes={(allQuizzes ?? []).map((q) => ({ id: q.id, title: q.title, ready: playable(cleanQuestions(q.questions)).length }))}
          added={new Set((links ?? []).map((l) => l.quiz_id))}
        />
        <QuizResults t={tq} lessonId={student.id} results={(results ?? []) as QuizResult[]} />
        <RemoveClassroom t={t} id={student.id} name={student.title} className="hidden md:flex" />
      </aside>
      <ClassroomFiles
        files={resources.map((r) => ({ id: r.id, kind: r.kind, name: r.name, size: r.size, created_at: r.created_at, url: r.url ?? undefined }))}
        teacherId={auth.user.id}
        lessonId={student.id}
        usedBytes={Number(usedBytes ?? 0)}
      />
      {/* Phones: Remove sits at the very end of the page, after the files. */}
      <RemoveClassroom t={t} id={student.id} name={student.title} className="flex md:hidden" />
    </>
  );
}

function RemoveClassroom({ t, id, name, className }: { t: T; id: string; name: string; className: string }) {
  return (
    <form action={removeLesson} className={`flex-col gap-1 px-1 ${className}`}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="then" value="dashboard" />
      <RemoveButton name={name} />
      <span className="text-[13px] text-ink-muted">{t.removeClassroomHint}</span>
    </form>
  );
}

// The student link in a read-only field with Copy. The host is read on the client.
function StudentLink({ t, slug, name }: { t: T; slug: string; name: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{t.namesLink(name)}</span>
      <div className="flex gap-2">
        <LinkField slug={slug} label={t.namesLink(name)} />
        <CopyLinkButton slug={slug} label={t.copy} />
      </div>
      <span className="text-[13px] text-ink-muted">{t.linkHint(name)}</span>
    </div>
  );
}

type QuizResult = { id: string; quiz_title: string; score: number; total: number; created_at: string };

// Q1: the quizzes checked in this student's lessons, newest first.
function QuizResults({ t, lessonId, results }: { t: Messages["quiz"]; lessonId: string; results: QuizResult[] }) {
  return (
    <section aria-labelledby="quiz-results" className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5">
      <h2 id="quiz-results" className="flex items-center gap-2 text-[15px] font-semibold">
        <ListChecks size={16} aria-hidden className="text-accent" />
        {t.results}
      </h2>
      {results.length ? (
        <ul className="flex flex-col">
          {results.map((r) => {
            const share = r.score / r.total;
            return (
              <li key={r.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0 first:pt-0">
                <span
                  className={`inline-flex h-9 min-w-12 shrink-0 items-center justify-center rounded-md px-2 text-sm font-bold ${
                    share >= 0.8 ? "bg-ok/10 text-ok" : share >= 0.5 ? "bg-marker-soft text-marker-ink" : "bg-danger-soft text-danger"
                  }`}
                >
                  {r.score}/{r.total}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{r.quiz_title}</span>
                  <span className="text-[13px] text-ink-muted">
                    <LocalDate iso={r.created_at} />
                  </span>
                </span>
                <form action={removeQuizResult}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="lessonId" value={lessonId} />
                  <button
                    aria-label={t.removeResult(r.quiz_title)}
                    title={t.removeResult(r.quiz_title)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-danger-soft hover:text-danger focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">{t.noResults}</p>
      )}
    </section>
  );
}

// Q1b: the quizzes added to this Classroom (only these are in its lessons), and adding one.
function ClassroomQuizzes({
  t,
  lessonId,
  quizzes,
  added,
}: {
  t: Messages["quiz"];
  lessonId: string;
  quizzes: { id: string; title: string; ready: number }[];
  added: Set<string>;
}) {
  const inHere = quizzes.filter((q) => added.has(q.id));
  const others = quizzes.filter((q) => !added.has(q.id));
  return (
    <section
      aria-labelledby="classroom-quizzes"
      className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5"
    >
      <h2
        id="classroom-quizzes"
        className="flex items-center gap-2 text-[15px] font-semibold"
      >
        <ListChecks size={16} aria-hidden className="text-accent" />
        {t.quizzes}
      </h2>
      {inHere.length ? (
        <ul className="flex flex-col">
          {inHere.map((q) => (
            <li
              key={q.id}
              className="flex items-center gap-2 border-t border-line py-2 first:border-t-0 first:pt-0"
            >
              <Link
                href={`/dashboard/quiz/${q.id}`}
                className="flex min-w-0 flex-1 flex-col rounded-md hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                <span className="truncate text-sm font-medium">{q.title}</span>
                <span
                  className={`text-[13px] ${q.ready ? "text-ink-muted" : "text-warn"}`}
                >
                  {q.ready ? t.questionCount(q.ready) : t.noneReady}
                </span>
              </Link>
              <form action={classroomQuizForm}>
                <input type="hidden" name="quizId" value={q.id} />
                <input type="hidden" name="lessonId" value={lessonId} />
                <input type="hidden" name="on" value="0" />
                <button
                  aria-label={t.takeOut(q.title)}
                  title={t.takeOut(q.title)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                >
                  <X size={15} aria-hidden />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">{t.noQuizzesHere}</p>
      )}
      {others.length > 0 && (
        <form action={classroomQuizForm} className="flex gap-2">
          <input type="hidden" name="lessonId" value={lessonId} />
          <input type="hidden" name="on" value="1" />
          <label htmlFor="add-quiz" className="sr-only">
            {t.addQuizLabel}
          </label>
          <select
            id="add-quiz"
            name="quizId"
            required
            defaultValue=""
            className={`${inputClass()} !h-10 min-w-0 flex-1 py-0`}
          >
            <option value="" disabled>
              {t.chooseQuiz}
            </option>
            {others.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
          <SubmitButton
            variant="secondary"
            className="h-10 px-3.5 font-semibold"
            pending={t.adding}
          >
            <Plus size={15} aria-hidden />
            {t.add}
          </SubmitButton>
        </form>
      )}
      <form action={createQuiz}>
        <input type="hidden" name="lessonId" value={lessonId} />
        <SubmitButton
          variant="ghost"
          className="h-9 px-2 text-sm font-semibold !text-accent"
          pending={t.creating}
        >
          <Plus size={15} aria-hidden />
          {t.newQuizHere}
        </SubmitButton>
      </form>
    </section>
  );
}

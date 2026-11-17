import { ListChecks, Plus, Video } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import CopyLinkButton from "@/components/CopyLinkButton";
import { AutoRefresh, ConfirmSubmit, DashboardLoading, DoneLeaving, LocalDate } from "@/components/dashboard/DashboardBits";
import { CardMenu, FeedbackButton, LanguageMenu, NameChip } from "@/components/dashboard/DashboardMenus";
import { buttonClass } from "@/components/ui/Button";
import SubmitButton, { LessonStartScreen } from "@/components/ui/SubmitButton";
import Field from "@/components/ui/Field";
import Marker from "@/components/ui/Marker";
import Wordmark from "@/components/ui/Wordmark";
import { occupiedLessons } from "@/lib/livekit";
import { createClient } from "@/lib/supabase/server";
import { isWithin, QUICK_CALL_MAX_AGE_MS } from "@/lib/time";
import { addStudent, removeLesson, setTeacherName, signOut, startQuickCall } from "./actions";
import { MAX_CLASSROOMS } from "@/lib/limits";
import { createQuiz } from "./quiz/actions";
import { cleanQuestions, MAX_QUIZZES, playable } from "@/lib/quiz";
import { getT } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n/messages";

type T = Messages["dashboard"];

// Private: never listed by search engines.
export const metadata: Metadata = { title: "Your classrooms", robots: { index: false, follow: false } };

// Time for the teacher to get into a new quick call before it counts as empty.
const QUICK_CALL_GRACE_MS = 2 * 60 * 1000;

// The dashboard (docs/design/HANDOFF.md, "Dashboard"; screens Dashboard, Dashboard-new):
// header with the name chip, "Your classrooms" with Start a quick call, a grid of classroom
// cards and an "Add a classroom" card.
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <Dashboard />
    </Suspense>
  );
}

type Lesson = {
  id: string;
  title: string;
  invite_slug: string;
  kind: "student" | "quick";
  last_active_at: string | null;
  created_at: string;
};

async function Dashboard() {
  const [supabase, { dashboard: t, common, quiz: tq }] = await Promise.all([createClient(), getT()]);

  // Each call is a round trip to Supabase or LiveKit (0.3–0.7 s), so they run side by side.
  const [{ data: auth }, { data }, { data: fileRows }, occupiedOrUnknown, { data: quizRows }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("lessons")
      .select("id, title, invite_slug, kind, last_active_at, created_at")
      .order("title"),
    supabase.from("resources").select("lesson_id, kind"),
    occupiedLessons(),
    supabase.from("quizzes").select("id, title, questions, updated_at").order("updated_at", { ascending: false }),
  ]);
  const teacherName: string = auth.user?.user_metadata.display_name ?? "";
  const occupied = occupiedOrUnknown ?? new Set<string>();

  let lessons = (data ?? []) as Lesson[];

  // Quick calls that are over: older than 12 hours, or nobody is in them (only when LiveKit
  // could actually be asked, and not in the first minutes while the teacher is joining).
  // One delete, and only when there is something to delete.
  const over = lessons.filter(
    (l) =>
      l.kind === "quick" &&
      (!isWithin(l.created_at, QUICK_CALL_MAX_AGE_MS) ||
        (occupiedOrUnknown !== null &&
          !occupied.has(l.id) &&
          !isWithin(l.created_at, QUICK_CALL_GRACE_MS))),
  );
  if (over.length) {
    await supabase
      .from("lessons")
      .delete()
      .in("id", over.map((l) => l.id));
    lessons = lessons.filter((l) => !over.includes(l));
  }

  const quickCalls = lessons.filter((l) => l.kind === "quick");
  const students = lessons.filter((l) => l.kind === "student");
  const firstVisit = !teacherName;
  const counts = countFiles((fileRows ?? []) as { lesson_id: string; kind: string }[], t);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <AutoRefresh />
      <DoneLeaving />
      <header className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-4 px-[clamp(16px,4vw,32px)] py-5">
        {/* First visit: the arrow doodle is the page's marker stroke, so no underline here. */}
        <Wordmark underline={firstVisit ? "none" : "still"} />
        <div className="flex items-center gap-2">
          <LanguageMenu />
          <FeedbackButton />
          <NameChip name={teacherName} />
          <form action={signOut}>
            <SubmitButton variant="ghost" size="sm" className="h-9 text-ink!" pending={t.loggingOut}>
              {t.logOut}
            </SubmitButton>
          </form>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-7 px-[clamp(16px,4vw,32px)] pt-3 pb-16">
        {firstVisit && <Welcome t={t} common={common} suggested={auth.user?.user_metadata.given_name ?? auth.user?.user_metadata.full_name ?? ""} />}

        {quickCalls.map((call) => (
          <section
            key={call.id}
            aria-label={t.quickCallInProgress}
            className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-panel border border-accent bg-surface px-5 py-4"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-accent">
              <Video size={18} aria-hidden />
            </span>
            <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
              <span className="font-semibold">{t.quickCallInProgress}</span>
              <span className="text-sm text-ink-muted">
                {occupied.has(call.id) ? t.studentWaiting : t.nobodyInCall}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <CopyLinkButton slug={call.invite_slug} icon />
              <Link href={`/lesson/${call.id}`} className={buttonClass("primary", "sm", "h-9 font-semibold")}>
                {t.rejoin}
              </Link>
              <form action={removeLesson}>
                <input type="hidden" name="id" value={call.id} />
                <ConfirmSubmit
                  message={t.endQuickCallConfirm}
                  pending={<span className="text-danger">{t.ending}</span>}
                >
                  <span className="text-danger">{t.endCall}</span>
                </ConfirmSubmit>
              </form>
            </div>
          </section>
        ))}

        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="flex flex-[1_1_360px] flex-col gap-1.5">
            <h1 className="text-[30px] leading-[1.1] tracking-[-0.02em] md:text-4xl">
              {t.yourClassroomsTitle.before}
              <span className="relative isolate inline-block">
                {t.yourClassroomsTitle.marked}
                {/* The screen's one marker gesture; on a first visit the welcome arrow is, so it rests. */}
                <Marker
                  shape="underline"
                  delay={0.2}
                  play={firstVisit ? "none" : "draw"}
                  className="absolute -bottom-[0.15em] -left-[3%] -z-10 h-[0.3em] w-[106%]"
                />
              </span>
              {t.yourClassroomsTitle.after}
            </h1>
            <p className="max-w-[560px] text-ink-muted">
              {t.classroomsIntro}
            </p>
          </div>
          <form action={startQuickCall} className="flex w-full flex-col items-stretch gap-1.5 md:w-auto md:items-end">
            <LessonStartScreen />
            <SubmitButton className="h-12 px-[18px] font-semibold md:h-11" pending={t.starting}>
              <Video size={16} aria-hidden />
              {quickCalls.length ? t.startNewQuickCall : t.startQuickCall}
            </SubmitButton>
            <span className="text-[13px] text-ink-muted">
              {quickCalls.length ? t.newQuickCallHint : t.quickCallHint}
            </span>
          </form>
        </div>

        <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
          {students.map((student) => (
            <StudentCard
              key={student.id}
              t={t}
              student={student}
              waiting={occupied.has(student.id)}
              files={counts.get(student.id)}
            />
          ))}
          <li>
            {students.length < MAX_CLASSROOMS ? (
              <AddCard t={t} highlight={firstVisit || students.length === 0} />
            ) : (
              <p className="flex h-full items-center rounded-panel border-[1.5px] border-dashed border-line p-4 text-sm text-ink-muted">
                {t.classroomLimit(MAX_CLASSROOMS)}
              </p>
            )}
          </li>
          {students.length === 0 && (
            <li className="flex items-center gap-4 px-1 py-2">
              <ArrowDoodle />
              <div className="flex flex-col gap-1">
                <span className="font-semibold">{t.firstStudentTitle}</span>
                <span className="text-sm leading-snug text-ink-muted">
                  {t.firstStudentText}
                </span>
              </div>
            </li>
          )}
        </ul>

        <Quizzes t={tq} quizzes={(quizRows ?? []) as QuizRow[]} />
      </main>
    </div>
  );
}

// "3 pictures · 2 PDFs · 2 audio" per classroom.
function countFiles(rows: { lesson_id: string; kind: string }[], t: T) {
  const byLesson = new Map<string, { image: number; pdf: number; doc: number; audio: number; link: number }>();
  for (const r of rows) {
    const c = byLesson.get(r.lesson_id) ?? { image: 0, pdf: 0, doc: 0, audio: 0, link: 0 };
    if (r.kind === "image" || r.kind === "pdf" || r.kind === "doc" || r.kind === "audio" || r.kind === "link") c[r.kind]++;
    byLesson.set(r.lesson_id, c);
  }
  const text = new Map<string, string>();
  for (const [id, c] of byLesson) {
    const parts = [
      c.image && t.countPictures(c.image),
      c.pdf && t.countPdfs(c.pdf),
      c.doc && t.countWord(c.doc),
      c.audio && t.countAudio(c.audio),
      c.link && t.countLinks(c.link),
    ].filter(Boolean);
    if (parts.length) text.set(id, parts.join(" · "));
  }
  return text;
}

// First visit: the name students see, asked first thing. Afterwards it's in the header chip.
// `suggested`: the first name from Google, for teachers who signed up with Google.
function Welcome({ t, common, suggested }: { t: T; common: Messages["common"]; suggested: string }) {
  return (
    <section className="flex flex-wrap items-end gap-x-8 gap-y-5 rounded-panel border border-accent bg-surface p-6">
      <div className="flex flex-[1_1_340px] flex-col gap-1.5">
        <h2 className="font-display text-[26px] leading-[1.15] font-extrabold tracking-[-0.01em]">
          {t.welcomeTitle}
        </h2>
        <p className="text-ink-muted">{t.welcomeText}</p>
      </div>
      <form action={setTeacherName} className="flex flex-[1_1_340px] items-end gap-2">
        <Field
          label={t.nameInLessons}
          name="name"
          placeholder={t.namePlaceholder}
          defaultValue={String(suggested).slice(0, 40)}
          maxLength={40}
          required
          className="min-w-0 flex-1"
        />
        <SubmitButton className="h-11 px-5 font-semibold" pending={common.saving}>
          {common.save}
        </SubmitButton>
      </form>
    </section>
  );
}

// The last card: a dashed border, a name field and Add.
function AddCard({ t, highlight }: { t: T; highlight: boolean }) {
  return (
    <form
      action={addStudent}
      className={`flex h-full flex-col gap-3.5 rounded-panel border-[1.5px] border-dashed p-4 ${
        highlight ? "border-accent bg-surface" : "border-ink-muted"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-ink-muted text-lg text-ink-muted">
          +
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[17px] font-semibold">{t.addClassroom}</span>
          <span className="text-sm text-ink-muted">{t.forNewStudent}</span>
        </div>
      </div>
      <div className="flex gap-2 border-t border-line pt-3">
        <input
          name="title"
          aria-label={t.studentName}
          placeholder={t.studentNamePlaceholder}
          required
          className="h-9 min-w-0 flex-1 rounded-md border border-line bg-surface px-2.5 text-[15px] text-ink placeholder:text-ink-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
        />
        <SubmitButton variant="secondary" size="sm" className="h-9 px-3.5 font-semibold" pending={t.adding}>
          {t.add}
        </SubmitButton>
      </div>
    </form>
  );
}

// First visit: the page's one marker stroke, pointing at "Add a classroom".
function ArrowDoodle() {
  return (
    <svg width="104" height="64" viewBox="0 0 104 64" aria-hidden className="shrink-0 marker-draw">
      <path
        d="M98 50 C 74 60, 36 54, 14 28"
        pathLength={1}
        className="marker-stroke"
        fill="none"
        stroke="var(--color-marker)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M8 37 L 13 25 L 26 27"
        pathLength={1}
        className="marker-stroke"
        style={{ animationDelay: "0.55s" }}
        fill="none"
        stroke="var(--color-marker)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A classroom card. The whole card opens the classroom; the buttons sit above that link.
// A waiting student: ink border, yellow offset shadow, "Waiting" circled, Start lesson primary.
function StudentCard({ t, student, waiting, files }: { t: T; student: Lesson; waiting: boolean; files?: string }) {
  return (
    <li
      className={`relative flex flex-col gap-3.5 rounded-panel border bg-surface p-4 transition hover:border-ink hover:shadow-[3px_3px_0_var(--color-marker)] motion-safe:hover:-translate-y-0.5 ${
        waiting ? "border-ink shadow-[3px_3px_0_var(--color-marker)]" : "border-line"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-lg font-extrabold text-accent">
          {student.title.charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link
            href={`/dashboard/${student.id}`}
            aria-label={t.openClassroom(student.title)}
            className="truncate text-[17px] font-semibold text-ink after:absolute after:inset-0 after:rounded-panel focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent"
          >
            {student.title}
          </Link>
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
        {waiting && (
          // Circled by the marker when the student arrives (it mounts then; refreshes keep it).
          <span className="relative rounded-full bg-marker-soft px-2.5 py-0.5 text-xs font-semibold text-marker-ink">
            {t.waiting}
            <Marker
              shape="circle"
              width={2.2}
              delay={0.4}
              className="absolute -top-1.5 -left-2 h-[calc(100%+0.75rem)] w-[calc(100%+1rem)]"
            />
          </span>
        )}
      </div>
      <p className="flex items-center gap-1.5 text-[13px] text-ink-muted">
        <Paperclip />
        {files ?? t.noFilesYet}
      </p>
      <div className="relative z-10 flex items-center gap-1.5 border-t border-line pt-3">
        <Link
          href={`/lesson/${student.id}`}
          className={buttonClass(waiting ? "primary" : "secondary", "sm", "h-9 font-semibold whitespace-nowrap")}
        >
          <Video size={16} aria-hidden />
          {t.startLessonShort}
        </Link>
        <CopyLinkButton slug={student.invite_slug} label={t.copyLink} name={student.title} variant="ghost" icon />
        <span className="flex-1" />
        <CardMenu id={student.id} name={student.title} />
      </div>
    </li>
  );
}

function Paperclip() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

type QuizRow = { id: string; title: string; questions: unknown; updated_at: string };

// Q1: the teacher's quizzes, under her Classrooms. Each card opens the editor.
function Quizzes({ t, quizzes }: { t: Messages["quiz"]; quizzes: QuizRow[] }) {
  return (
    <section aria-labelledby="quizzes-title" className="mt-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex flex-[1_1_360px] flex-col gap-1.5">
          <h2 id="quizzes-title" className="font-display text-[26px] leading-[1.15] font-extrabold tracking-[-0.01em]">
            {t.yourQuizzes}
          </h2>
          <p className="max-w-[560px] text-ink-muted">{t.quizzesIntro}</p>
        </div>
        {quizzes.length < MAX_QUIZZES ? (
          <form action={createQuiz}>
            <SubmitButton variant="secondary" className="h-11 px-[18px] font-semibold" pending={t.creating}>
              <Plus size={16} aria-hidden />
              {t.newQuiz}
            </SubmitButton>
          </form>
        ) : (
          <p className="text-sm text-ink-muted">{t.quizLimit(MAX_QUIZZES)}</p>
        )}
      </div>
      {quizzes.length ? (
        <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr))]">
          {quizzes.map((q) => {
            const questions = cleanQuestions(q.questions);
            const ready = playable(questions).length;
            return (
              <li key={q.id}>
                <Link
                  href={`/dashboard/quiz/${q.id}`}
                  aria-label={t.openQuiz(q.title)}
                  className="flex h-full items-start gap-3 rounded-panel border border-line bg-surface p-4 hover:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marker-soft text-marker-ink">
                    <ListChecks size={18} aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-semibold">{q.title}</span>
                    <span className="text-[13px] text-ink-muted">
                      {t.questionCount(ready)} · <LocalDate iso={q.updated_at} />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-panel border-[1.5px] border-dashed border-line p-4 text-sm text-ink-muted">{t.noQuizzesYet}</p>
      )}
    </section>
  );
}

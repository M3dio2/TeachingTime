import Link from "next/link";
import { Suspense } from "react";
import CopyLinkButton from "@/components/CopyLinkButton";
import { AutoRefresh, ConfirmSubmit, LocalDate } from "@/components/dashboard/DashboardBits";
import Button, { buttonClass } from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Marker from "@/components/ui/Marker";
import Wordmark from "@/components/ui/Wordmark";
import { occupiedLessons } from "@/lib/livekit";
import { createClient } from "@/lib/supabase/server";
import { isWithin, QUICK_CALL_MAX_AGE_MS } from "@/lib/time";
import { addStudent, removeLesson, setTeacherName, signOut, startQuickCall } from "./actions";

// Time for the teacher to get into a new quick call before it counts as empty.
const QUICK_CALL_GRACE_MS = 2 * 60 * 1000;

export default function DashboardPage() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col gap-8 p-4 sm:p-8">
      {/* Full width, so "Log out" sits in the top-right corner; the content below is centred. */}
      <header className="flex items-center justify-between">
        <Wordmark underline="draw" />
        <form action={signOut}>
          <Button variant="ghost" size="sm">
            Log out
          </Button>
        </form>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <Suspense fallback={<p className="text-ink-muted">Loading…</p>}>
          <Lessons />
        </Suspense>
      </div>
    </main>
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

async function Lessons() {
  const supabase = await createClient();

  // Each call is a round trip to Supabase or LiveKit (0.3–0.7 s), so they run side by side.
  const [{ data: auth }, { data }, occupiedOrUnknown] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("lessons")
      .select("id, title, invite_slug, kind, last_active_at, created_at")
      .order("title"),
    occupiedLessons(),
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

  return (
    <>
      <AutoRefresh />
      {!teacherName && <NameForm name="" />}

      <section className="flex flex-col gap-3">
        {quickCalls.map((call) => (
          <div
            key={call.id}
            className="flex flex-wrap items-center gap-2 rounded-panel border border-accent bg-surface p-4"
          >
            <div className="flex-1">
              <p className="font-semibold">Quick call in progress</p>
              <p className="text-sm text-ink-muted">
                {occupied.has(call.id) ? "Your student is waiting." : "Nobody is in the call."}
              </p>
            </div>
            <CopyLinkButton slug={call.invite_slug} />
            <Link href={`/lesson/${call.id}`} className={buttonClass("primary", "sm")}>
              Rejoin
            </Link>
            <form action={removeLesson}>
              <input type="hidden" name="id" value={call.id} />
              <ConfirmSubmit message="End this quick call? The student link will stop working.">
                End
              </ConfirmSubmit>
            </form>
          </div>
        ))}
        <form action={startQuickCall}>
          <Button className="w-full py-3 text-lg">
            {quickCalls.length ? "Start a new quick call" : "Start a quick call"}
          </Button>
        </form>
        <p className="text-center text-sm text-ink-muted">
          {quickCalls.length
            ? "Ends the call above and starts a fresh one with a new student link."
            : "A one-off call with a new student link. Nothing is saved."}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h1 className="text-xl">Your classrooms</h1>
        <ul className="flex flex-col gap-3">
          {students.map((student) => (
            <StudentCard key={student.id} student={student} waiting={occupied.has(student.id)} />
          ))}
        </ul>
        {students.length === 0 && (
          <p className="text-ink-muted">
            Add a classroom for each student: a place for their files and a link that stays the same every week.
          </p>
        )}
        <form action={addStudent} className="flex items-end gap-2">
          <Field
            label="Add a classroom"
            name="title"
            placeholder="Student's name, e.g. Anna"
            required
            className="min-w-0 flex-1"
          />
          <Button variant="secondary">Add</Button>
        </form>
      </section>

      {teacherName && <NameForm name={teacherName} />}
    </>
  );
}

// The name students see in calls. Asked first thing until it's set; afterwards it sits at the
// bottom of the page so it can be changed.
function NameForm({ name }: { name: string }) {
  const firstTime = !name;
  return (
    <section
      className={`flex flex-col gap-2 rounded-panel p-4 ${
        firstTime ? "border border-accent bg-surface" : "border border-line"
      }`}
    >
      {firstTime && (
        <>
          <h1 className="text-xl">Welcome! What should your students call you?</h1>
          <p className="text-sm text-ink-muted">
            This name is shown on your camera in every lesson. You can change it later.
          </p>
        </>
      )}
      {/* key: a fresh input after saving, so it shows the saved name. */}
      <form key={name} action={setTeacherName} className="flex items-end gap-2">
        <Field
          label="Your name in lessons"
          name="name"
          defaultValue={name}
          placeholder="e.g. Ms Smith"
          maxLength={40}
          required
          className="min-w-0 flex-1"
        />
        <Button variant={firstTime ? "primary" : "secondary"}>Save</Button>
      </form>
    </section>
  );
}

// The whole card opens the classroom; the buttons sit above the card link.
function StudentCard({ student, waiting }: { student: Lesson; waiting: boolean }) {
  return (
    // Hover: the card lifts onto a yellow marker shadow (docs/DESIGN.md).
    <li className="relative flex flex-wrap items-center gap-3 rounded-panel border border-line bg-surface p-4 transition hover:border-ink hover:shadow-[3px_3px_0_var(--color-marker)] motion-safe:hover:-translate-y-0.5">
      <Link
        href={`/dashboard/${student.id}`}
        aria-label={`Open ${student.title}'s classroom`}
        className="absolute inset-0 rounded-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      <div className="flex-1">
        <p className="flex items-center gap-2 font-semibold">
          {student.title}
          {waiting && (
            // Circled by the marker when the student arrives (it mounts then; refreshes keep it).
            <span className="relative rounded-full bg-marker-soft px-2 py-0.5 text-xs font-medium text-marker-ink">
              Waiting
              <Marker
                shape="circle"
                width={2.2}
                delay={0.4}
                className="absolute -top-1.5 -left-2 h-[calc(100%+0.75rem)] w-[calc(100%+1rem)]"
              />
            </span>
          )}
        </p>
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
      <div className="relative flex items-center gap-1">
        {/* A waiting student shouldn't wait for the classroom to load. */}
        {waiting && (
          <Link href={`/lesson/${student.id}`} className={buttonClass("primary", "sm")}>
            Start lesson
          </Link>
        )}
        <CopyLinkButton slug={student.invite_slug} />
        <form action={removeLesson}>
          <input type="hidden" name="id" value={student.id} />
          <ConfirmSubmit message={`Remove ${student.title}? Their link will stop working.`}>
            Remove
          </ConfirmSubmit>
        </form>
        <span aria-hidden className="pl-1 text-ink-muted">
          →
        </span>
      </div>
    </li>
  );
}

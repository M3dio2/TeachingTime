import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackToClassrooms, ClassroomLoading } from "@/components/classroom/ClassroomBits";
import QuizEditor from "@/components/quiz/QuizEditor";
import Wordmark from "@/components/ui/Wordmark";
import { cleanQuestions } from "@/lib/quiz";
import { createClient } from "@/lib/supabase/server";

// Private: never listed by search engines.
export const metadata: Metadata = { title: "Quiz", robots: { index: false, follow: false } };

// Q1: one quiz in the editor (made in the dashboard, used in any lesson).
export default function QuizPage({ params }: PageProps<"/dashboard/quiz/[id]">) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-4 px-[clamp(16px,4vw,32px)] py-5">
        <Wordmark underline="still" />
        <BackToClassrooms />
      </header>
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-[clamp(16px,4vw,32px)] pt-3 pb-24">
        <Suspense fallback={<ClassroomLoading />}>
          <Quiz params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function Quiz({ params }: Pick<PageProps<"/dashboard/quiz/[id]">, "params">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, { data: classrooms }, { data: links }] = await Promise.all([
    supabase.from("quizzes").select("id, title, questions").eq("id", id).maybeSingle(),
    supabase.from("lessons").select("id, title").eq("kind", "student").order("title"),
    supabase.from("quiz_classrooms").select("lesson_id").eq("quiz_id", id),
  ]);
  if (!data) notFound();
  return (
    <QuizEditor
      quiz={{ id: data.id, title: data.title, questions: cleanQuestions(data.questions) }}
      classrooms={(classrooms ?? []).map((c) => ({ id: c.id, name: c.title }))}
      inClassrooms={(links ?? []).map((l) => l.lesson_id)}
    />
  );
}

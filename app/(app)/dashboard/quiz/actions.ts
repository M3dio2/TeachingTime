"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { cleanQuestions, cleanTitle, emptyChoice, MAX_QUIZZES, MAX_TITLE } from "@/lib/quiz";
import { createClient } from "@/lib/supabase/server";

// "New quiz" on the dashboard: an untitled quiz with one empty question, opened in the editor.
export async function createQuiz() {
  const t = await getT();
  const supabase = await createClient();
  const { count } = await supabase.from("quizzes").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_QUIZZES) return; // the dashboard says why; the database refuses too
  const { data, error } = await supabase
    .from("quizzes")
    .insert({ title: t.quiz.untitled.slice(0, MAX_TITLE), questions: [emptyChoice()] })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  redirect(`/dashboard/quiz/${data.id}`);
}

// The editor saves the whole quiz a moment after each change. RLS limits it to her own quizzes.
export async function saveQuiz(id: string, title: unknown, questions: unknown): Promise<boolean> {
  const t = await getT();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quizzes")
    .update({
      title: cleanTitle(title) || t.quiz.untitled,
      questions: cleanQuestions(questions),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return false;
  revalidatePath("/dashboard");
  return true;
}

export async function duplicateQuiz(formData: FormData) {
  const id = String(formData.get("id"));
  const t = await getT();
  const supabase = await createClient();
  const { data: quiz } = await supabase.from("quizzes").select("title, questions").eq("id", id).maybeSingle();
  if (!quiz) return;
  const { data, error } = await supabase
    .from("quizzes")
    .insert({ title: t.quiz.copyOf(quiz.title).slice(0, MAX_TITLE), questions: cleanQuestions(quiz.questions) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  redirect(`/dashboard/quiz/${data.id}`);
}

export async function deleteQuiz(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("quizzes").delete().eq("id", id);
  revalidatePath("/dashboard");
  if (formData.get("then") === "dashboard") redirect("/dashboard");
}

// The teacher checked a quiz in a lesson: the result goes into the student's Classroom.
export async function saveQuizResult(result: {
  lessonId: string;
  quizId: string;
  quizTitle: string;
  score: number;
  total: number;
  answers: unknown[];
}): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("quiz_results").insert({
    lesson_id: result.lessonId,
    quiz_id: result.quizId,
    quiz_title: cleanTitle(result.quizTitle) || "Quiz",
    score: Math.max(0, Math.floor(result.score)),
    total: Math.max(1, Math.floor(result.total)),
    answers: result.answers.slice(0, 50),
  });
  if (error) {
    console.error("quiz result:", error.message);
    return false;
  }
  revalidatePath(`/dashboard/${result.lessonId}`);
  return true;
}

export async function removeQuizResult(formData: FormData) {
  const id = String(formData.get("id"));
  const lessonId = String(formData.get("lessonId"));
  const supabase = await createClient();
  await supabase.from("quiz_results").delete().eq("id", id);
  revalidatePath(`/dashboard/${lessonId}`);
}

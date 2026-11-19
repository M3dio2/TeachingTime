-- Q1: quizzes. A teacher prepares quizzes in the dashboard (her own library, not tied to one
-- Classroom) and opens them in a lesson like a file. The student answers live; when the teacher
-- checks the answers, the result is saved in that student's Classroom (quiz_results).
-- The questions are a JSON array checked by the app (lib/quiz.ts); here only shape and size.

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  questions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(questions) = 'array' and pg_column_size(questions) <= 200000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quizzes_teacher_idx on public.quizzes (teacher_id, updated_at desc);

alter table public.quizzes enable row level security;

drop policy if exists "Teachers manage their own quizzes" on public.quizzes;
create policy "Teachers manage their own quizzes"
  on public.quizzes
  for all
  to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

-- At most 100 quizzes per teacher (same idea as the Classroom cap in 0008).
create or replace function public.limit_quizzes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.quizzes where teacher_id = new.teacher_id) >= 100 then
    raise exception 'quiz limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_quizzes on public.quizzes;
create trigger limit_quizzes
  before insert on public.quizzes
  for each row execute function public.limit_quizzes();

-- One row each time the teacher checks a quiz in a lesson. The title is copied, so the result
-- still makes sense after the quiz is changed or deleted.
create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  quiz_id uuid references public.quizzes (id) on delete set null,
  quiz_title text not null check (char_length(quiz_title) between 1 and 80),
  score integer not null check (score >= 0),
  total integer not null check (total > 0 and score <= total),
  answers jsonb not null default '[]'::jsonb
    check (jsonb_typeof(answers) = 'array' and pg_column_size(answers) <= 100000),
  created_at timestamptz not null default now()
);

create index if not exists quiz_results_lesson_idx on public.quiz_results (lesson_id, created_at desc);

alter table public.quiz_results enable row level security;

drop policy if exists "Teachers manage their students' quiz results" on public.quiz_results;
create policy "Teachers manage their students' quiz results"
  on public.quiz_results
  for all
  to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.teacher_id = (select auth.uid()) and l.kind = 'student'
    )
  );

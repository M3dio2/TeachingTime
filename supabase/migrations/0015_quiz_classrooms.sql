-- Q1b: a quiz is made in the dashboard and then added to one or more Classrooms; only those
-- lessons list it. Quizzes made before this get every Classroom of their teacher (so nothing
-- that worked yesterday disappears from a lesson).

create table if not exists public.quiz_classrooms (
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  teacher_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (quiz_id, lesson_id)
);

create index if not exists quiz_classrooms_lesson_idx on public.quiz_classrooms (lesson_id);

alter table public.quiz_classrooms enable row level security;

-- Her own quiz into her own student Classroom only.
drop policy if exists "Teachers add their quizzes to their Classrooms" on public.quiz_classrooms;
create policy "Teachers add their quizzes to their Classrooms"
  on public.quiz_classrooms
  for all
  to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.quizzes q where q.id = quiz_id and q.teacher_id = (select auth.uid()))
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.teacher_id = (select auth.uid()) and l.kind = 'student'
    )
  );

-- Existing quizzes: in every Classroom of their teacher, once (running this file again adds
-- nothing for quizzes that already have a Classroom).
insert into public.quiz_classrooms (quiz_id, lesson_id, teacher_id)
select q.id, l.id, q.teacher_id
from public.quizzes q
join public.lessons l on l.teacher_id = q.teacher_id and l.kind = 'student'
where not exists (select 1 from public.quiz_classrooms c where c.quiz_id = q.id)
  and q.created_at < '2026-11-24'
on conflict do nothing;

-- Review A4 + A5: plan the next lesson of a Classroom, and keep dated lesson notes.
-- Safe to run more than once.

-- A4: when the next lesson is (the teacher's local time, stored as a point in time), and
-- whether it repeats every week (then the date moves on by itself once it's past).
alter table public.lessons add column if not exists next_lesson_at timestamptz;
alter table public.lessons add column if not exists repeats_weekly boolean not null default false;

-- A5: notes per Classroom, e.g. the text pad of a lesson saved with its date. Only the teacher
-- reads and writes them (students don't have accounts).
create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  teacher_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_date date not null default current_date,
  body text not null check (char_length(body) between 1 and 50000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_notes_lesson_idx on public.lesson_notes (lesson_id, lesson_date desc);

alter table public.lesson_notes enable row level security;

-- Her own notes, only in her own student Classrooms.
drop policy if exists "Teachers keep notes in their Classrooms" on public.lesson_notes;
create policy "Teachers keep notes in their Classrooms"
  on public.lesson_notes
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

-- At most 500 notes per Classroom (abuse guard; a weekly lesson for 10 years is 520).
create or replace function public.limit_lesson_notes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.lesson_notes where lesson_id = new.lesson_id) >= 500 then
    raise exception 'Too many notes in this Classroom' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_lesson_notes on public.lesson_notes;
create trigger limit_lesson_notes
  before insert on public.lesson_notes
  for each row execute function public.limit_lesson_notes();

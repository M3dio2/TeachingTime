-- Calendar: a Classroom's lessons at set times, once or every week; one lesson of a weekly
-- series can be moved or cancelled; a private link puts all of them into Google / Apple /
-- Outlook calendar. Safe to run more than once.

create table if not exists public.lesson_slots (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  teacher_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  starts_at timestamptz not null,              -- the first lesson
  minutes int not null default 60 check (minutes between 15 and 240),
  weekly boolean not null default false,
  ends_on date,                                -- a weekly series' last day (null: open)
  time_zone text not null default 'UTC' check (char_length(time_zone) <= 64), -- weekly: same local time across DST
  created_at timestamptz not null default now()
);

create index if not exists lesson_slots_teacher_idx on public.lesson_slots (teacher_id);
create index if not exists lesson_slots_lesson_idx on public.lesson_slots (lesson_id);

alter table public.lesson_slots enable row level security;

drop policy if exists "Teachers plan their own lessons" on public.lesson_slots;
create policy "Teachers plan their own lessons"
  on public.lesson_slots
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

-- One lesson of a weekly series, changed: cancelled, or at another time / length.
create table if not exists public.slot_changes (
  slot_id uuid not null references public.lesson_slots (id) on delete cascade,
  teacher_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  occurs_at timestamptz not null,               -- when that lesson was meant to start
  cancelled boolean not null default false,
  moved_to timestamptz,
  moved_minutes int check (moved_minutes between 15 and 240),
  primary key (slot_id, occurs_at)
);

alter table public.slot_changes enable row level security;

drop policy if exists "Teachers change their own lessons" on public.slot_changes;
create policy "Teachers change their own lessons"
  on public.slot_changes
  for all
  to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.lesson_slots s where s.id = slot_id and s.teacher_id = (select auth.uid()))
  );

-- At most 300 planned series per teacher (abuse guard).
create or replace function public.limit_lesson_slots()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.lesson_slots where teacher_id = new.teacher_id) >= 300 then
    raise exception 'Too many planned lessons' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_lesson_slots on public.lesson_slots;
create trigger limit_lesson_slots
  before insert on public.lesson_slots
  for each row execute function public.limit_lesson_slots();

-- The private calendar link (/api/calendar/<token>): one per teacher, can be replaced.
create table if not exists public.calendar_feeds (
  teacher_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

alter table public.calendar_feeds enable row level security;

drop policy if exists "Teachers see their own calendar link" on public.calendar_feeds;
create policy "Teachers see their own calendar link"
  on public.calendar_feeds
  for all
  to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

-- The "next lesson" planned so far (0017) becomes a slot, once (UTC: the zone wasn't stored).
insert into public.lesson_slots (lesson_id, teacher_id, starts_at, minutes, weekly)
select l.id, l.teacher_id, l.next_lesson_at, 60, l.repeats_weekly
from public.lessons l
where l.next_lesson_at is not null
  and l.kind = 'student'
  and not exists (select 1 from public.lesson_slots s where s.lesson_id = l.id);

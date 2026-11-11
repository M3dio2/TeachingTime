-- G1 (going public): limits per teacher, so one account can't use up the shared free plans,
-- plus two tables to hear from people: feedback (the dashboard's "Feedback" button) and
-- error_reports (the error pages). Read both in the Supabase table editor.
-- - Storage: 50 MB per teacher (was 200 MB; Supabase's free plan has 1 GB for everyone).
-- - Lesson time: 20 hours a month per teacher, at most 3 hours per lesson. LiveKit tells us
--   when a room starts and ends (webhook, app/api/livekit-webhook); the token route asks
--   lesson_time() before letting anyone in.
--
-- After running this file, in the LiveKit dashboard: Settings → Webhooks → add
--   https://<your site>/api/livekit-webhook  (signing key: the project's API key)
-- Until then nothing is counted, and lessons are never refused for time.

-- Storage: same policy as 0006, with 50 MB.
drop policy if exists "Teachers upload into their students' folders" on storage.objects;

create policy "Teachers upload into their students' folders"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'resources'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.lessons l
      where l.id::text = (storage.foldername(name))[2]
        and l.teacher_id = (select auth.uid())
        and l.kind = 'student'
    )
    and (select public.resources_used_bytes()) < 52428800  -- 50 MB
  );

-- One row per LiveKit room session (a room's sid is new each time it starts).
-- No foreign key to lessons: a quick call's row is deleted when it ends, its time still counts.
create table if not exists public.lesson_sessions (
  room_sid text primary key,
  lesson_id uuid not null,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists lesson_sessions_teacher_month
  on public.lesson_sessions (teacher_id, started_at);

alter table public.lesson_sessions enable row level security;

-- Teachers can read their own (for "hours left this month" later); only the server writes.
drop policy if exists "Teachers read their own sessions" on public.lesson_sessions;
create policy "Teachers read their own sessions"
  on public.lesson_sessions
  for select
  to authenticated
  using (teacher_id = (select auth.uid()));

-- A session's length: until it ended, or until now while it's open. An open session counts
-- at most 3 hours, in case LiveKit's "room finished" call never arrived.
create or replace function public.session_seconds(s public.lesson_sessions)
returns bigint
language sql
stable
set search_path = ''
as $$
  select greatest(0, extract(epoch from (
    coalesce(s.ended_at, least(now(), s.started_at + interval '3 hours')) - s.started_at
  )))::bigint
$$;

-- For the token route: this calendar month's lesson seconds for the teacher (UTC), and how
-- long the lesson's open session has been running (0 if none).
create or replace function public.lesson_time(p_teacher uuid, p_lesson uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'month_seconds', coalesce((
      select sum(public.session_seconds(s)) from public.lesson_sessions s
      where s.teacher_id = p_teacher and s.started_at >= date_trunc('month', now())
    ), 0),
    'open_seconds', coalesce((
      select max(extract(epoch from now() - s.started_at))::bigint from public.lesson_sessions s
      where s.lesson_id = p_lesson and s.ended_at is null
        and s.started_at > now() - interval '1 day'
    ), 0)
  )
$$;

revoke execute on function public.lesson_time from public, anon, authenticated;
grant execute on function public.lesson_time to service_role;

-- "Feedback" in the dashboard header. Teachers can only add their own; nobody reads it through
-- the API (the table editor still can).
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  teacher_id uuid references auth.users (id) on delete set null,
  message text not null check (char_length(message) between 1 and 2000),
  page text check (char_length(page) <= 200),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "Teachers send feedback" on public.feedback;
create policy "Teachers send feedback"
  on public.feedback
  for insert
  to authenticated
  with check (teacher_id = (select auth.uid()));

-- What the error pages caught (app/error.tsx, app/global-error.tsx via /api/report-error,
-- which writes with the secret key and is rate limited). No policies: server only.
create table if not exists public.error_reports (
  id bigint generated always as identity primary key,
  message text check (char_length(message) <= 1000),
  digest text check (char_length(digest) <= 100),
  page text check (char_length(page) <= 200),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);

alter table public.error_reports enable row level security;

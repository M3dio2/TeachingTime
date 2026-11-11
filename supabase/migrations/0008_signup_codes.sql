-- C2 (security review): new teacher accounts need an invite code, checked by Supabase Auth
-- itself (a "before user created" hook), so calling the Auth API directly can't skip it.
-- Plus a cap of 30 classrooms per teacher.
--
-- After running this file, in the Supabase dashboard:
--   Authentication → Hooks → "Before User Created" → Postgres → public.hook_require_invite_code
-- Then add a code (keep it out of git), e.g.:
--   insert into public.signup_codes (code, uses_left, note) values ('pick-a-long-code', 10, 'friends test');

create table if not exists public.signup_codes (
  code text primary key check (char_length(code) between 8 and 100),
  uses_left int not null default 1 check (uses_left >= 0),
  note text,
  created_at timestamptz not null default now()
);

-- Nobody reads or writes this through the API: RLS on, no policies. The dashboard and the
-- hook below (security definer) still can.
alter table public.signup_codes enable row level security;

-- The sign-up form sends the code as user metadata (`invite_code`). A valid code with uses left
-- is used up by one; anything else blocks the sign-up with a message the form shows.
create or replace function public.hook_require_invite_code(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  given text := trim(coalesce(event->'user'->'user_metadata'->>'invite_code', ''));
  used int;
begin
  update public.signup_codes
     set uses_left = uses_left - 1
   where code = given and uses_left > 0;
  get diagnostics used = row_count;
  if used = 1 then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object('http_code', 403, 'message', 'invite code not valid')
  );
end;
$$;

grant execute on function public.hook_require_invite_code to supabase_auth_admin;
revoke execute on function public.hook_require_invite_code from authenticated, anon, public;

-- At most 30 student classrooms per teacher (quick calls are one at a time already).
create or replace function public.limit_classrooms()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'student' and (
    select count(*) from public.lessons where teacher_id = new.teacher_id and kind = 'student'
  ) >= 30 then
    raise exception 'classroom limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_classrooms on public.lessons;
create trigger limit_classrooms
  before insert on public.lessons
  for each row execute function public.limit_classrooms();

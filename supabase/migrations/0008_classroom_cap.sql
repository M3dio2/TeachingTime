-- C2 (security review): at most 30 classrooms per teacher, so one account can't use up the
-- shared free plans. (An invite-code hook was planned here; sign-up is open instead, with a
-- CAPTCHA, see docs/ROADMAP.md, G1.)

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

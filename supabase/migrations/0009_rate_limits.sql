-- H4 (security review): rate limits for the API routes, shared by every server instance.
-- lib/rateLimit.ts calls hit_rate_limit with the secret key; it also keeps a per-instance
-- count, so the routes stay limited even before this file is run.

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits int not null default 0
);

alter table public.rate_limits enable row level security;  -- no policies: server only

-- Counts one hit for `p_key` in a fixed window and says whether it's still within `p_limit`.
create or replace function public.hit_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  count_now int;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into count_now;

  -- Now and then, forget old windows so the table stays small.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return count_now <= p_limit;
end;
$$;

revoke execute on function public.hit_rate_limit from public, anon, authenticated;
grant execute on function public.hit_rate_limit to service_role;

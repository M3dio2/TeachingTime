-- Library folders: one level of folders for the teacher's Library files ("Grammar", "Books",
-- "Listening"). A file is in at most one folder; deleting a folder keeps its files (they go
-- back to "no folder"). Safe to run more than once.

create table if not exists public.library_folders (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);

create index if not exists library_folders_teacher_idx on public.library_folders (teacher_id);

alter table public.library_folders enable row level security;

drop policy if exists "Teachers manage their own folders" on public.library_folders;
create policy "Teachers manage their own folders"
  on public.library_folders
  for all
  to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

-- At most 100 folders per teacher (abuse guard).
create or replace function public.limit_library_folders()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.library_folders where teacher_id = new.teacher_id) >= 100 then
    raise exception 'Too many folders' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_library_folders on public.library_folders;
create trigger limit_library_folders
  before insert on public.library_folders
  for each row execute function public.limit_library_folders();

alter table public.resources
  add column if not exists folder_id uuid references public.library_folders (id) on delete set null;

create index if not exists resources_folder_idx on public.resources (folder_id) where folder_id is not null;

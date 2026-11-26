-- Library: a file the teacher uploads once and uses in several Classrooms (all of them, or the
-- ones she picks), stored and counted once. Files uploaded inside a Classroom stay that
-- Classroom's own. Library files may be bigger (books): 50 MB. Safe to run more than once.

-- A Library file has no Classroom of its own.
alter table public.resources alter column lesson_id drop not null;
alter table public.resources add column if not exists in_library boolean not null default false;
alter table public.resources add column if not exists all_classrooms boolean not null default false;

alter table public.resources drop constraint if exists resources_owner_shape;
alter table public.resources
  add constraint resources_owner_shape check (
    (in_library and lesson_id is null) or (not in_library and lesson_id is not null and not all_classrooms)
  );

create index if not exists resources_library_idx on public.resources (teacher_id) where in_library;

-- Classroom files at <teacher>/<lesson>/…, Library files at <teacher>/library/….
drop policy if exists "Teachers manage their own files" on public.resources;
create policy "Teachers manage their own files"
  on public.resources
  for all
  to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and (
      (
        in_library
        and ((kind = 'link' and path is null) or path like teacher_id::text || '/library/%')
      )
      or (
        not in_library
        and exists (
          select 1 from public.lessons l
          where l.id = lesson_id and l.teacher_id = (select auth.uid()) and l.kind = 'student'
        )
        and ((kind = 'link' and path is null) or path like teacher_id::text || '/' || lesson_id::text || '/%')
      )
    )
  );

-- Which Classrooms a Library file is in (unless it's in all of them).
create table if not exists public.resource_classrooms (
  resource_id uuid not null references public.resources (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  teacher_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (resource_id, lesson_id)
);

create index if not exists resource_classrooms_lesson_idx on public.resource_classrooms (lesson_id);

alter table public.resource_classrooms enable row level security;

drop policy if exists "Teachers add their Library files to their Classrooms" on public.resource_classrooms;
create policy "Teachers add their Library files to their Classrooms"
  on public.resource_classrooms
  for all
  to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and exists (
      select 1 from public.resources r
      where r.id = resource_id and r.teacher_id = (select auth.uid()) and r.in_library
    )
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.teacher_id = (select auth.uid()) and l.kind = 'student'
    )
  );

-- Uploads: into a student's folder or the Library folder; 200 MB per teacher in all.
drop policy if exists "Teachers upload into their students' folders" on storage.objects;
create policy "Teachers upload into their students' folders"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'resources'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (
      (storage.foldername(name))[2] = 'library'
      or exists (
        select 1 from public.lessons l
        where l.id::text = (storage.foldername(name))[2]
          and l.teacher_id = (select auth.uid())
          and l.kind = 'student'
      )
    )
    and (select public.resources_used_bytes()) < 209715200  -- 200 MB
  );

-- Moving a Classroom file into the Library renames its object (<lesson>/x → library/x).
drop policy if exists "Teachers move their own files" on storage.objects;
create policy "Teachers move their own files"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'resources' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'resources' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Library files: no limit of their own, only the 200 MB per teacher (whole books). Classroom
-- files stay at 10 MB (0007). The bucket takes the project's upload limit (Supabase Free: 50 MB
-- per file; Pro: up to 500 GB, set in Storage → Settings).
alter table public.resources drop constraint if exists resources_size_range;
alter table public.resources
  add constraint resources_size_range check (
    size between 0 and (case when in_library then 209715200 else 10485760 end)
  );
update storage.buckets set file_size_limit = null where id = 'resources';

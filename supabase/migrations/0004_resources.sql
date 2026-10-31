-- C1 classroom: the teacher's files for each student (PDF and audio). Only the teacher uploads;
-- students will get short-lived signed URLs from the server (L2a), never direct access.
-- Files live in the private bucket "resources" at <teacher_id>/<lesson_id>/<random name>.

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  teacher_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('pdf', 'audio')),
  name text not null,          -- the original file name, shown to the teacher
  path text not null unique,   -- object path in the bucket
  size bigint not null,
  created_at timestamptz not null default now()
);

create index resources_lesson_id_idx on public.resources (lesson_id);

alter table public.resources enable row level security;

-- Own rows only, attached to one of the teacher's own students, stored in the teacher's folder.
create policy "Teachers manage their own files"
  on public.resources
  for all
  to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.teacher_id = (select auth.uid()) and l.kind = 'student'
    )
    and path like teacher_id::text || '/' || lesson_id::text || '/%'
  );

-- Private bucket: 20 MB per file, PDF and audio only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resources', 'resources', false, 20971520, array['application/pdf', 'audio/*']);

create policy "Teachers read their own files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'resources'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

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
  );

create policy "Teachers delete their own files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'resources'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

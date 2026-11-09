-- Storage limits: 10 MB per file, 200 MB per teacher across all their classrooms.
-- The free tier has 1 GB in total, shared by every teacher, so one teacher can't fill it.

update storage.buckets
set file_size_limit = 10485760  -- 10 MB
where id = 'resources';

-- Bytes the signed-in teacher has stored, counted from Storage itself (not the resources
-- table), so files without a row count too. Security definer: it only ever reads the
-- caller's own folder.
create or replace function public.resources_used_bytes()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
  from storage.objects o
  where o.bucket_id = 'resources'
    and (storage.foldername(o.name))[1] = (select auth.uid())::text
$$;

revoke execute on function public.resources_used_bytes() from public, anon;
grant execute on function public.resources_used_bytes() to authenticated;

-- Same as in 0004, plus: no new upload once the teacher is at 200 MB. The new file's size
-- isn't known yet when this runs, so the last upload can go over by at most one file (10 MB).
-- The upload form checks the exact total first.
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
    and (select public.resources_used_bytes()) < 209715200  -- 200 MB
  );

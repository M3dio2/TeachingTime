-- G2: links in the classroom (YouTube videos and any web page), next to the files.
-- A link has a url and no stored object: path is empty, size 0, and it doesn't count
-- towards the teacher's storage.
alter table public.resources alter column path drop not null;
alter table public.resources add column if not exists url text;

alter table public.resources drop constraint resources_kind_check;
alter table public.resources
  add constraint resources_kind_check check (kind in ('pdf', 'audio', 'image', 'doc', 'link'));

alter table public.resources drop constraint if exists resources_link_shape;
alter table public.resources
  add constraint resources_link_shape check (
    (kind = 'link' and path is null and size = 0 and url ~ '^https?://' and char_length(url) <= 2000)
    or (kind <> 'link' and path is not null and url is null)
  );

-- Same as in 0004, with links allowed (no path then).
drop policy if exists "Teachers manage their own files" on public.resources;
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
    and (
      (kind = 'link' and path is null)
      or path like teacher_id::text || '/' || lesson_id::text || '/%'
    )
  );

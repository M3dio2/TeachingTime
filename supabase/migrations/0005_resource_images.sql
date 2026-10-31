-- Classroom pictures: a third kind of file next to PDF and audio.
-- Common web formats only: no SVG (it can carry scripts) and no HEIC (browsers can't show it).
alter table public.resources drop constraint resources_kind_check;
alter table public.resources
  add constraint resources_kind_check check (kind in ('pdf', 'audio', 'image'));

update storage.buckets
set allowed_mime_types = array[
  'application/pdf', 'audio/*', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'
]
where id = 'resources';

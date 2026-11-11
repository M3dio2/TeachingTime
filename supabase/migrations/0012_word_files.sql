-- G2: Word files (.docx) in the classroom, a fourth kind next to pictures, PDFs and audio.
-- Shown in the call by the browser (docx-preview); old .doc files aren't accepted.
alter table public.resources drop constraint resources_kind_check;
alter table public.resources
  add constraint resources_kind_check check (kind in ('pdf', 'audio', 'image', 'doc'));

update storage.buckets
set allowed_mime_types = array[
  'application/pdf', 'audio/*', 'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
where id = 'resources';

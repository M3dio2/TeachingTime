-- F1: videos and text files in a Classroom, next to pictures, PDFs, Word files, audio and links.
-- - video: MP4, MOV, WebM; plays in the lesson for both, in sync
-- - text: plain text (.txt); shown in the lesson as text
-- Still 10 MB per file and 50 MB per teacher (0006, 0010). Safe to run twice, also after the
-- first version of this file (which allowed more kinds).

alter table public.resources drop constraint if exists resources_kind_check;
alter table public.resources
  add constraint resources_kind_check
  check (kind in ('pdf', 'audio', 'image', 'doc', 'link', 'video', 'text'));

update storage.buckets
set allowed_mime_types = array[
  'application/pdf', 'audio/*', 'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4', 'video/quicktime', 'video/webm',
  'text/plain'
]
where id = 'resources';

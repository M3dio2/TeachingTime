-- F1: more kinds of file in a Classroom. Next to pictures, PDFs, Word files, audio and links:
-- - video: MP4, WebM, MOV; plays in the lesson for both, in sync
-- - text: plain text, Markdown, CSV; shown in the lesson as text
-- - file: anything else on the list below (PowerPoint, Excel, OpenDocument, old Word, RTF,
--   EPUB, ZIP); shown in the lesson as a card both can download
-- Still 10 MB per file and 50 MB per teacher (0006, 0010). Safe to run twice.

alter table public.resources drop constraint if exists resources_kind_check;
alter table public.resources
  add constraint resources_kind_check
  check (kind in ('pdf', 'audio', 'image', 'doc', 'link', 'video', 'text', 'file'));

update storage.buckets
set allowed_mime_types = array[
  'application/pdf', 'audio/*', 'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  -- video
  'video/mp4', 'video/webm', 'video/quicktime',
  -- text
  'text/plain', 'text/markdown', 'text/csv',
  -- other documents (download only)
  'application/msword',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.presentation',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/rtf',
  'application/epub+zip',
  'application/zip'
]
where id = 'resources';

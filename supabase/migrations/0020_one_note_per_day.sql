-- Lesson notes (0017): one note per Classroom and day, however often the teacher leaves and
-- rejoins. Notes already saved twice on one day are merged into the earliest one first.
-- Safe to run more than once.

with dupes as (
  select lesson_id, lesson_date,
         (array_agg(id order by created_at))[1] as keep,
         string_agg(body, E'\n\n———\n\n' order by created_at) as merged,
         count(*) as n
  from public.lesson_notes
  group by lesson_id, lesson_date
  having count(*) > 1
)
update public.lesson_notes n
set body = left(d.merged, 50000), updated_at = now()
from dupes d
where n.id = d.keep;

delete from public.lesson_notes n
using (
  select id, row_number() over (partition by lesson_id, lesson_date order by created_at) as rn
  from public.lesson_notes
) r
where n.id = r.id and r.rn > 1;

create unique index if not exists lesson_notes_one_per_day on public.lesson_notes (lesson_id, lesson_date);

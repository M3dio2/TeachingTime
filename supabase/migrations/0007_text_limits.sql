-- The forms cap these already; the database does too, so a direct API call can't store huge
-- names (the dashboard and the files panel show them on every load).
alter table public.lessons
  add constraint lessons_title_length check (char_length(title) between 1 and 80),
  add constraint lessons_invite_slug_format check (invite_slug ~ '^[a-z0-9]{6,40}$');

alter table public.resources
  add constraint resources_name_length check (char_length(name) between 1 and 200),
  add constraint resources_size_range check (size between 0 and 10485760);  -- 10 MB

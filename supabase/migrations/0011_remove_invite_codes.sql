-- G1: sign-up is open (with a CAPTCHA), so the invite codes of the first 0008 go.
-- Safe to run whether or not that version was run. Switch the hook off first if it was on:
--   Authentication → Hooks → "Before User Created" → disable / delete.
-- The 30-classroom cap (also in 0008) stays.

drop function if exists public.hook_require_invite_code(jsonb);
drop table if exists public.signup_codes;

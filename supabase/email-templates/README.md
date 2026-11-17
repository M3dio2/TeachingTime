# Supabase email templates

Pasted by hand into Supabase → Authentication → Emails (live and test project). One template per
email type holds all four languages; it picks the teacher's `user_metadata.locale` (saved at
sign-up, at the first login, by Google sign-in and by the dashboard's language menu), else English.

- Confirm sign up: subject `confirm-signup.subject.txt`, body `confirm-signup.html`
- Reset password: subject `reset-password.subject.txt`, body `reset-password.html`

Links point at `/auth/confirm` (see `app/auth/confirm/route.ts`). Test a change locally with Go:
render it with `html/template` and data `{RedirectTo, TokenHash, Data: {locale}}`, also with
`Data` nil.

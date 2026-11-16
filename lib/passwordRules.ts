// Password rules for sign-up and reset. Supabase checks the same (Auth → Providers → Email:
// minimum length 10, "letters and digits"), so a form that skips this still can't save a weak one.
export const PASSWORD_MIN_LENGTH = 10;

import type { Messages } from "@/lib/i18n/messages";

// Labels come from the dictionary (t.auth), so they follow the page's language.
export const passwordRules = [
  {
    id: "length",
    label: (t: Messages) => t.auth.ruleLength(PASSWORD_MIN_LENGTH),
    test: (p: string) => p.length >= PASSWORD_MIN_LENGTH,
  },
  { id: "mix", label: (t: Messages) => t.auth.ruleMix, test: (p: string) => /\p{L}/u.test(p) && /\d/.test(p) },
];

// What's wrong, in plain words, or null when the password can be saved.
export function passwordProblem(password: string, confirm: string, t: Messages) {
  if (!passwordRules.every((rule) => rule.test(password))) {
    return t.auth.passwordTooWeak(PASSWORD_MIN_LENGTH);
  }
  if (password !== confirm) return t.auth.passwordsDontMatch;
  return null;
}

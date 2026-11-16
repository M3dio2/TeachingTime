import type { AuthError } from "@supabase/supabase-js";
import type { Messages } from "@/lib/i18n/messages";

// Plain-language messages for Supabase auth errors (docs/DESIGN.md: no raw error text), in the
// page's language: pass the dictionary (`useT()` / `await getT()`). Texts: t.auth.errors.
export function authErrorMessage(error: AuthError, t: Messages) {
  const messages: Record<string, string> = t.auth.errors;
  return (error.code && Object.hasOwn(messages, error.code) && messages[error.code]) || t.auth.errorUnknown;
}

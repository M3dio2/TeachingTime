import type { AuthError } from "@supabase/supabase-js";

// Plain-language messages for Supabase auth errors (docs/DESIGN.md: no raw error text).
const messages: Record<string, string> = {
  invalid_credentials: "Wrong email or password. Check both, or reset your password.",
  email_not_confirmed: "Please confirm your email first: click the link we sent you.",
  user_already_exists: "There's already an account with this email. Log in instead.",
  email_exists: "There's already an account with this email. Log in instead.",
  weak_password: "Please use at least 10 characters, with letters and numbers.",
  same_password: "That's your current password. Please choose a new one.",
  email_address_invalid: "Please check the email address.",
  signup_disabled: "New accounts can't be created right now.",
  over_email_send_rate_limit: "Too many emails were sent. Please try again in an hour.",
  over_request_rate_limit: "Too many tries. Please wait a minute and try again.",
  captcha_failed: "The check that you're not a robot didn't work. Please wait for the tick and try again.",
};

export function authErrorMessage(error: AuthError) {
  return (error.code && messages[error.code]) || "Something went wrong. Please try again.";
}

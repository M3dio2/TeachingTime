import type { ReactNode } from "react";

// Login, sign-up, password reset, link expired (components/auth/*, lib/authErrors.ts).
// Texts with a link or bold part take that part as an argument, so each language can place it.
export const auth = {
  // AuthCard's right-hand panel
  brandTitle: "Every lesson in one calm room.",
  brandText: "Video, screen sharing, a shared notebook and a whiteboard. Your student joins with a link, no account needed.",
  brandPoints: [
    "Both cameras stay visible while you share your screen",
    "Notes and drawings update instantly for both of you",
    "You decide when your student can write and draw",
  ],

  // Shared form bits
  email: "Email",
  emailPlaceholder: "you@example.com",
  password: "Password",
  showPassword: "Show password",
  hidePassword: "Hide password",
  backToLogin: "Back to login",
  logIn: "Log in",
  checkEmail: "Check your email",
  noEmail: "No email after a few minutes? Look in your spam folder.",

  // Captcha
  captchaFailed: "The check that you're not a robot didn't load. Reload the page, or try another browser.",
  captchaWait: "Checking you're not a robot…",

  // Google
  googleContinue: "Continue with Google",
  googleOpening: "Opening Google…",
  googleStartFailed: "Google sign-in didn't start. Please try again.",
  googleFailed: "Google sign-in didn't finish. Please try again, or log in with email.",
  orWithEmail: "or with email",

  // Login
  loginTitle: "Teacher login",
  loginIntro: "Welcome back. Log in to see your Classrooms.",
  passwordPlaceholder: "Your password",
  forgotPasswordLink: "Forgot your password?",
  loggingIn: "Logging in…",
  newHere: "New here?",
  createTeacherAccount: "Create a teacher account",
  areYouStudent: "Are you a student?",
  studentHint: "Open the invite link from your teacher. You don't need an account.",

  // Sign-up
  signupIntro: "Set up a Classroom for each student and invite them with a link.",
  yourName: "Your name",
  namePlaceholder: "e.g. Laura",
  nameHint: "Students see it on your camera in every lesson.",
  creatingAccount: "Creating your account…",
  createAccount: "Create account",
  agreeTerms: (terms: ReactNode, privacy: ReactNode): ReactNode => (
    <>
      By creating an account you agree to the {terms} and the {privacy}.
    </>
  ),
  termsLink: "terms",
  privacyLink: "privacy policy",
  haveAccount: "Already have an account?",
  signupSent: (email: ReactNode): ReactNode => (
    <>We sent a link to {email}. Click it to finish creating your account.</>
  ),

  // Forgot password
  forgotTitle: "Forgot your password?",
  forgotIntro: "Enter your email and we'll send you a link to choose a new one.",
  sendLink: "Send link",
  resetSent: (email: ReactNode): ReactNode => (
    <>If there&apos;s an account for {email}, we sent it a link to choose a new password.</>
  ),

  // New password (sign-up and reset)
  confirmPassword: "Confirm password",
  passwordsDontMatch: "The two passwords don't match.",
  ruleLength: (n: number) => `${n} characters or more`,
  ruleMix: "Letters and numbers",
  ruleDone: "(done)",
  ruleNotYet: "(not yet)",
  passwordTooWeak: (n: number) => `Please use at least ${n} characters, with letters and numbers.`,

  // Reset password
  resetTitle: "Choose a new password",
  resetIntro: "You'll use it the next time you log in.",
  newPassword: "New password",
  savePassword: "Save password",

  // Link expired
  expiredTitle: "This link has expired",
  expiredIntro: "Email links work once, for a limited time. If you already used it, just log in.",
  resettingPassword: "Resetting your password?",
  sendNewLink: "Send a new link",

  // Supabase errors (lib/authErrors.ts), by error code
  errors: {
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
  },
  errorUnknown: "Something went wrong. Please try again.",
};

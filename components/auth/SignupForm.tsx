"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import AuthCard, { FormError, submitClass, textLink } from "@/components/auth/AuthCard";
import NewPasswordFields from "@/components/auth/NewPasswordFields";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import { authErrorMessage } from "@/lib/authErrors";
import { passwordProblem } from "@/lib/passwordRules";
import { createClient } from "@/lib/supabase/client";

// New teacher account. The name goes into user metadata (display_name), the same place the
// dashboard's name prompt writes, so a new teacher isn't asked for it again.
// With "Confirm email" on in Supabase, signUp returns no session and the teacher gets a link
// (handled by /auth/confirm); with it off, they're logged in straight away.
export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name.trim().slice(0, 40) },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      setLoading(false);
      setError(authErrorMessage(error));
      return;
    }
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    setLoading(false);
    setEmailSent(true);
  }

  if (emailSent) {
    return (
      <AuthCard
        title="Check your email"
        icon={<Mail size={24} aria-hidden />}
        intro={
          <span className="text-ink">
            We sent a link to <strong className="font-semibold">{email}</strong>. Click it to finish creating
            your account.
          </span>
        }
      >
        <p className="rounded-md bg-surface-2 px-3.5 py-3 text-sm text-ink-muted">
          No email after a few minutes? Look in your spam folder.
        </p>
        <BackToLogin />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create a teacher account"
      intro="Set up a classroom for each student and invite them with a link."
    >
      <form onSubmit={signUp} className="flex flex-col gap-4">
        <Field
          label="Your name"
          placeholder="e.g. Laura"
          hint="Students see it on your camera in every lesson."
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          maxLength={40}
          required
        />
        <Field
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <NewPasswordFields
          label="Password"
          password={password}
          confirm={confirm}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirm}
        />
        {error && <FormError>{error}</FormError>}
        <Button disabled={loading} className={submitClass}>
          {loading ? "Creating your account…" : "Create account"}
        </Button>
      </form>
      <p className="text-[15px] text-ink-muted">
        Already have an account?{" "}
        <Link href="/" className={textLink}>
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}

export function BackToLogin() {
  return (
    <Link href="/" className={`${textLink} inline-flex items-center gap-1.5 self-start text-[15px]`}>
      <ArrowLeft size={16} aria-hidden />
      Back to login
    </Link>
  );
}

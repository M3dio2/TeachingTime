"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import AuthCard, { FormError, submitClass } from "@/components/auth/AuthCard";
import { BackToLogin } from "@/components/auth/SignupForm";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import { authErrorMessage } from "@/lib/authErrors";
import { createClient } from "@/lib/supabase/client";

// Sends a reset link. The email template points it at /auth/confirm (type=recovery), which logs
// the teacher in and continues to /reset-password. Supabase answers the same whether or not the
// email has an account, so the message doesn't say either.
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard
        title="Check your email"
        icon={<Mail size={24} aria-hidden />}
        intro={
          <span className="text-ink">
            If there&apos;s an account for <strong className="font-semibold">{email}</strong>, we sent it a link
            to choose a new password.
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
      title="Forgot your password?"
      intro="Enter your email and we'll send you a link to choose a new one."
    >
      <form onSubmit={sendLink} className="flex flex-col gap-4">
        <Field
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        {error && <FormError>{error}</FormError>}
        <Button disabled={loading} className={submitClass}>
          {loading ? "Sending…" : "Send link"}
        </Button>
      </form>
      <BackToLogin />
    </AuthCard>
  );
}

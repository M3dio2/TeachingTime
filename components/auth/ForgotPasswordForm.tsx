"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import AuthCard, { FormError, submitClass } from "@/components/auth/AuthCard";
import { CaptchaBox, useCaptcha } from "@/components/auth/Captcha";
import { BackToLogin } from "@/components/auth/SignupForm";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import { authErrorMessage } from "@/lib/authErrors";
import { useT } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

// Sends a reset link. The email template points it at /auth/confirm (type=recovery), which logs
// the teacher in and continues to /reset-password. Supabase answers the same whether or not the
// email has an account, so the message doesn't say either.
export default function ForgotPasswordForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const captcha = useCaptcha();

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
      captchaToken: captcha.token ?? undefined,
    });
    captcha.reset();
    setLoading(false);
    if (error) {
      setError(authErrorMessage(error, t));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard
        title={t.auth.checkEmail}
        icon={<Mail size={24} aria-hidden />}
        intro={
          <span className="text-ink">{t.auth.resetSent(<strong className="font-semibold">{email}</strong>)}</span>
        }
      >
        <p className="rounded-md bg-surface-2 px-3.5 py-3 text-sm text-ink-muted">{t.auth.noEmail}</p>
        <BackToLogin />
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t.auth.forgotTitle} intro={t.auth.forgotIntro}>
      <form onSubmit={sendLink} className="flex flex-col gap-4">
        <Field
          label={t.auth.email}
          type="email"
          placeholder={t.auth.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <CaptchaBox {...captcha.box} />
        {error && <FormError>{error}</FormError>}
        <Button disabled={loading || captcha.token === null} className={submitClass}>
          {loading ? t.common.sending : captcha.token === null ? t.auth.captchaWait : t.auth.sendLink}
        </Button>
      </form>
      <BackToLogin />
    </AuthCard>
  );
}

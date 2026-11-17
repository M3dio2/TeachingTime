"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import AuthCard, { FormError, submitClass, textLink } from "@/components/auth/AuthCard";
import { CaptchaBox, useCaptcha } from "@/components/auth/Captcha";
import GoogleButton from "@/components/auth/GoogleButton";
import NewPasswordFields from "@/components/auth/NewPasswordFields";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import { authErrorMessage } from "@/lib/authErrors";
import { useLocale, useT } from "@/lib/i18n/client";
import { passwordProblem } from "@/lib/passwordRules";
import { createClient } from "@/lib/supabase/client";

// New teacher account. The name goes into user metadata (display_name), the same place the
// dashboard's name prompt writes, so a new teacher isn't asked for it again.
// With "Confirm email" on in Supabase, signUp returns no session and the teacher gets a link
// (handled by /auth/confirm); with it off, they're logged in straight away.
export default function SignupForm() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const captcha = useCaptcha();

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(password, confirm, t);
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
        // `locale`: the language of the emails Supabase sends her (supabase/email-templates/).
        data: { display_name: name.trim().slice(0, 40), locale },
        emailRedirectTo: window.location.origin,
        captchaToken: captcha.token ?? undefined,
      },
    });
    captcha.reset();
    if (error) {
      setLoading(false);
      setError(authErrorMessage(error, t));
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
        title={t.auth.checkEmail}
        icon={<Mail size={24} aria-hidden />}
        intro={
          <span className="text-ink">{t.auth.signupSent(<strong className="font-semibold">{email}</strong>)}</span>
        }
      >
        <p className="rounded-md bg-surface-2 px-3.5 py-3 text-sm text-ink-muted">{t.auth.noEmail}</p>
        <BackToLogin />
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t.auth.createTeacherAccount} intro={t.auth.signupIntro}>
      <GoogleButton />
      <form onSubmit={signUp} className="flex flex-col gap-4">
        <Field
          label={t.auth.yourName}
          placeholder={t.auth.namePlaceholder}
          hint={t.auth.nameHint}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          maxLength={40}
          required
        />
        <Field
          label={t.auth.email}
          type="email"
          placeholder={t.auth.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <NewPasswordFields
          label={t.auth.password}
          password={password}
          confirm={confirm}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirm}
        />
        <CaptchaBox {...captcha.box} />
        {error && <FormError>{error}</FormError>}
        <Button disabled={loading || captcha.token === null} className={submitClass}>
          {loading ? t.auth.creatingAccount : captcha.token === null ? t.auth.captchaWait : t.auth.createAccount}
        </Button>
        <p className="text-[13px] leading-snug text-ink-muted">
          {t.auth.agreeTerms(
            <Link href="/terms" className={textLink}>
              {t.auth.termsLink}
            </Link>,
            <Link href="/privacy" className={textLink}>
              {t.auth.privacyLink}
            </Link>,
          )}
        </p>
      </form>
      <p className="text-[15px] text-ink-muted">
        {t.auth.haveAccount}{" "}
        <Link href="/login" className={textLink}>
          {t.auth.logIn}
        </Link>
      </p>
    </AuthCard>
  );
}

export function BackToLogin() {
  const t = useT();
  return (
    <Link href="/login" className={`${textLink} inline-flex items-center gap-1.5 self-start text-[15px]`}>
      <ArrowLeft size={16} aria-hidden />
      {t.auth.backToLogin}
    </Link>
  );
}

"use client";

import { Link2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import AuthCard, { FormError, submitClass, textLink } from "@/components/auth/AuthCard";
import { CaptchaBox, useCaptcha } from "@/components/auth/Captcha";
import GoogleButton from "@/components/auth/GoogleButton";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import PasswordField from "@/components/ui/PasswordField";
import { authErrorMessage } from "@/lib/authErrors";
import { useLocale, useT } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

// Teacher login. New teachers create an account at /signup; students never log in.
export default function LoginForm() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const captcha = useCaptcha();

  async function logIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: signedIn, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: captcha.token ?? undefined },
    });
    captcha.reset();
    // Accounts from before languages (I1) have none saved: the emails (password reset) need it.
    if (!error && !signedIn.user?.user_metadata.locale) {
      await supabase.auth.updateUser({ data: { locale } });
    }
    if (error) {
      setLoading(false);
      setError(authErrorMessage(error, t));
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthCard title={t.auth.loginTitle} intro={t.auth.loginIntro}>
      <GoogleFailed />
      <GoogleButton />
      <form onSubmit={logIn} className="flex flex-col gap-4">
        <Field
          label={t.auth.email}
          type="email"
          placeholder={t.auth.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          invalid={Boolean(error)}
          required
        />
        <PasswordField
          label={t.auth.password}
          placeholder={t.auth.passwordPlaceholder}
          aside={
            <Link href="/forgot-password" className={`${textLink} -my-3 inline-block py-3 text-sm`}>
              {t.auth.forgotPasswordLink}
            </Link>
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          invalid={Boolean(error)}
          required
        />
        <CaptchaBox {...captcha.box} />
        {error && <FormError>{error}</FormError>}
        <Button disabled={loading || captcha.token === null} className={submitClass}>
          {loading ? t.auth.loggingIn : captcha.token === null ? t.auth.captchaWait : t.auth.logIn}
        </Button>
      </form>
      <p className="text-[15px] text-ink-muted">
        {t.auth.newHere}{" "}
        <Link href="/signup" className={`${textLink} -my-3 inline-block py-3`}>
          {t.auth.createTeacherAccount}
        </Link>
      </p>
      <div className="flex items-start gap-3 rounded-panel border border-line bg-surface px-4 py-3.5 text-sm leading-snug">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-accent">
          <Link2 size={16} aria-hidden />
        </span>
        <span>
          <strong className="font-semibold">{t.auth.areYouStudent}</strong>{" "}
          <span className="text-ink-muted">{t.auth.studentHint}</span>
        </span>
      </div>
    </AuthCard>
  );
}

// Back from Google without a session (cancelled, or the link was used twice).
function GoogleFailed() {
  const t = useT();
  const failed = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("google") === "failed",
    () => false,
  );
  return failed ? <FormError>{t.auth.googleFailed}</FormError> : null;
}

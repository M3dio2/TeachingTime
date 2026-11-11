"use client";

import { Link2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthCard, { FormError, submitClass, textLink } from "@/components/auth/AuthCard";
import { CAPTCHA_WAIT, CaptchaBox, useCaptcha } from "@/components/auth/Captcha";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import PasswordField from "@/components/ui/PasswordField";
import { authErrorMessage } from "@/lib/authErrors";
import { createClient } from "@/lib/supabase/client";

// Teacher login. New teachers create an account at /signup; students never log in.
export default function LoginForm() {
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
    const { error } = await createClient().auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: captcha.token ?? undefined },
    });
    captcha.reset();
    if (error) {
      setLoading(false);
      setError(authErrorMessage(error));
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthCard title="Teacher login" intro="Welcome back. Log in to see your classrooms.">
      <form onSubmit={logIn} className="flex flex-col gap-4">
        <Field
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          invalid={Boolean(error)}
          required
        />
        <PasswordField
          label="Password"
          placeholder="Your password"
          aside={
            <Link href="/forgot-password" className={`${textLink} text-sm`}>
              Forgot your password?
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
          {loading ? "Logging in…" : captcha.token === null ? CAPTCHA_WAIT : "Log in"}
        </Button>
      </form>
      <p className="text-[15px] text-ink-muted">
        New here?{" "}
        <Link href="/signup" className={textLink}>
          Create a teacher account
        </Link>
      </p>
      <div className="flex items-start gap-3 rounded-panel border border-line bg-surface px-4 py-3.5 text-sm leading-snug">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-accent">
          <Link2 size={16} aria-hidden />
        </span>
        <span>
          <strong className="font-semibold">Are you a student?</strong>{" "}
          <span className="text-ink-muted">Open the invite link from your teacher. You don&apos;t need an account.</span>
        </span>
      </div>
    </AuthCard>
  );
}

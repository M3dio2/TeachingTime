"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthCard, { FormError, submitClass } from "@/components/auth/AuthCard";
import NewPasswordFields from "@/components/auth/NewPasswordFields";
import Button from "@/components/ui/Button";
import { authErrorMessage } from "@/lib/authErrors";
import { useT } from "@/lib/i18n/client";
import { passwordProblem } from "@/lib/passwordRules";
import { createClient } from "@/lib/supabase/client";

// Reached from the reset link (already logged in by /auth/confirm), or by a logged-in teacher.
export default function ResetPasswordForm() {
  const t = useT();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(password, confirm, t);
    if (problem) {
      setError(problem);
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setLoading(false);
      setError(authErrorMessage(error, t));
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthCard title={t.auth.resetTitle} intro={t.auth.resetIntro}>
      <form onSubmit={save} className="flex flex-col gap-4">
        <NewPasswordFields
          label={t.auth.newPassword}
          password={password}
          confirm={confirm}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirm}
        />
        {error && <FormError>{error}</FormError>}
        <Button disabled={loading} className={submitClass}>
          {loading ? t.common.saving : t.auth.savePassword}
        </Button>
      </form>
    </AuthCard>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthCard, { FormError, submitClass } from "@/components/auth/AuthCard";
import NewPasswordFields from "@/components/auth/NewPasswordFields";
import Button from "@/components/ui/Button";
import { authErrorMessage } from "@/lib/authErrors";
import { passwordProblem } from "@/lib/passwordRules";
import { createClient } from "@/lib/supabase/client";

// Reached from the reset link (already logged in by /auth/confirm), or by a logged-in teacher.
export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setLoading(false);
      setError(authErrorMessage(error));
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthCard title="Choose a new password" intro="You'll use it the next time you log in.">
      <form onSubmit={save} className="flex flex-col gap-4">
        <NewPasswordFields
          label="New password"
          password={password}
          confirm={confirm}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirm}
        />
        {error && <FormError>{error}</FormError>}
        <Button disabled={loading} className={submitClass}>
          {loading ? "Saving…" : "Save password"}
        </Button>
      </form>
    </AuthCard>
  );
}

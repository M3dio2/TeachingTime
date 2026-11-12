import type { Metadata } from "next";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

// Needs a session (from the reset link); proxy.ts sends logged-out visitors to the login page.
export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}

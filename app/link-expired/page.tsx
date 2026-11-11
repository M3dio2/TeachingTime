import { Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import AuthCard, { submitClass, textLink } from "@/components/auth/AuthCard";
import { buttonClass } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Link expired", robots: { index: false, follow: false } };

// Where /auth/confirm sends an expired or already used email link.
export default function LinkExpiredPage() {
  return (
    <AuthCard
      title="This link has expired"
      icon={<Clock size={24} aria-hidden />}
      intro="Email links work once, for a limited time. If you already used it, just log in."
    >
      <Link href="/login" className={buttonClass("primary", "md", submitClass)}>
        Log in
      </Link>
      <p className="text-[15px] text-ink-muted">
        Resetting your password?{" "}
        <Link href="/forgot-password" className={textLink}>
          Send a new link
        </Link>
      </p>
    </AuthCard>
  );
}

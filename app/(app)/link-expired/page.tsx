import { Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import AuthCard, { submitClass, textLink } from "@/components/auth/AuthCard";
import { buttonClass } from "@/components/ui/Button";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Link expired", robots: { index: false, follow: false } };

// Where /auth/confirm sends an expired or already used email link.
export default function LinkExpiredPage() {
  return (
    <Suspense>
      <LinkExpired />
    </Suspense>
  );
}

// getT() reads the language cookie, so it sits inside <Suspense> (cacheComponents).
async function LinkExpired() {
  const t = await getT();
  return (
    <AuthCard title={t.auth.expiredTitle} icon={<Clock size={24} aria-hidden />} intro={t.auth.expiredIntro}>
      <Link href="/login" className={buttonClass("primary", "md", submitClass)}>
        {t.auth.logIn}
      </Link>
      <p className="text-[15px] text-ink-muted">
        {t.auth.resettingPassword}{" "}
        <Link href="/forgot-password" className={textLink}>
          {t.auth.sendNewLink}
        </Link>
      </p>
    </AuthCard>
  );
}

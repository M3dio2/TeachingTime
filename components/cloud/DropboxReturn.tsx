"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { finishDropboxConnect } from "@/lib/cloud/dropbox";
import { useT } from "@/lib/i18n/client";

export default function DropboxReturn() {
  const t = useT().cloud;
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const q = new URLSearchParams(window.location.search);
    const code = q.get("code");
    const state = q.get("state");
    if (!code || !state) {
      queueMicrotask(() => setFailed(true));
      return;
    }
    finishDropboxConnect(code, state)
      .then((back) => router.replace(back))
      .catch((e) => {
        console.error("dropbox:", e);
        setFailed(true);
      });
  }, [router]);
  return failed ? (
    <div className="flex flex-col items-center gap-3 text-center">
      <p role="alert" className="text-danger">
        {t.dropboxFailed}
      </p>
      <Link href="/dashboard/settings" className="font-semibold text-accent underline-offset-2 hover:underline">
        {t.backToSettings}
      </Link>
    </div>
  ) : (
    <p className="text-ink-muted">{t.finishing}</p>
  );
}

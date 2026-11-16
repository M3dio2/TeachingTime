"use client";

import Link from "next/link";
import { useReportError } from "@/components/ErrorReport";
import RoomMessage from "@/components/room/RoomMessage";
import Button, { buttonClass } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/client";

// Any page that crashes shows this instead of a blank screen (G1). The error is reported.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useReportError(error);
  const t = useT();
  return (
    <RoomMessage
      title={t.common.somethingWentWrong}
      actions={
        <>
          <Button onClick={() => reset()}>{t.common.tryAgain}</Button>
          <Link href="/dashboard" className={buttonClass("secondary", "md")}>
            {t.common.backToStart}
          </Link>
        </>
      }
    >
      {t.common.crashText}
    </RoomMessage>
  );
}

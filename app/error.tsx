"use client";

import Link from "next/link";
import { useReportError } from "@/components/ErrorReport";
import RoomMessage from "@/components/room/RoomMessage";
import Button, { buttonClass } from "@/components/ui/Button";

// Any page that crashes shows this instead of a blank screen (G1). The error is reported.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useReportError(error);
  return (
    <RoomMessage
      title="Something went wrong"
      actions={
        <>
          <Button onClick={() => reset()}>Try again</Button>
          <Link href="/dashboard" className={buttonClass("secondary", "md")}>
            Back to the start
          </Link>
        </>
      }
    >
      Sorry about that. We&apos;ve been told about it. Try again, or reload the page.
    </RoomMessage>
  );
}

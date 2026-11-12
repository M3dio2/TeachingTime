import Link from "next/link";
import RoomMessage from "@/components/room/RoomMessage";
import { buttonClass } from "@/components/ui/Button";

export const metadata = { title: "Page not found", robots: { index: false } };

// A link that leads nowhere (G1).
export default function NotFound() {
  return (
    <RoomMessage
      title="This page doesn't exist"
      actions={
        <Link href="/dashboard" className={buttonClass("primary", "md")}>
          Go to TeachingTime
        </Link>
      }
    >
      Check the link. If a teacher sent it, ask them for the lesson link again.
    </RoomMessage>
  );
}

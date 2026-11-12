import type { Metadata } from "next";
import { Suspense } from "react";
import StudentJoin from "@/components/room/StudentJoin";

// A private link: never listed by search engines.
// What a student sees when the teacher sends the link (WhatsApp, Mail, Messages).
export const metadata: Metadata = {
  title: "Join your lesson",
  description: "Your teacher has invited you to a lesson. Open this link at lesson time: no account, no download.",
  openGraph: {
    title: "Join your lesson on TeachingTime",
    description: "Your teacher has invited you to a lesson. Open this link at lesson time: no account, no download.",
  },
  robots: { index: false, follow: false },
};

// The slug is checked by the token route when the student clicks Join.
export default function JoinPage({ params }: PageProps<"/join/[slug]">) {
  return (
    <Suspense>
      <Join params={params} />
    </Suspense>
  );
}

async function Join({ params }: Pick<PageProps<"/join/[slug]">, "params">) {
  const { slug } = await params;
  return <StudentJoin slug={slug} />;
}

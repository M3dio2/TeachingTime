import type { Metadata } from "next";
import { Suspense } from "react";
import StudentJoin from "@/components/room/StudentJoin";

// A private link: never listed by search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

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

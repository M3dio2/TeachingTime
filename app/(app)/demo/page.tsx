import type { Metadata } from "next";
import DemoLesson from "@/components/demo/DemoLesson";

// Review A1: try a lesson without an account. Public (proxy.ts doesn't guard /demo).
export const metadata: Metadata = {
  title: "Demo lesson",
  description: "Try TeachingTime in a demo lesson with a pretend student: worksheets, a shared text pad, a whiteboard and a quiz. No account needed.",
  alternates: { canonical: "/demo" },
};

export default function DemoPage() {
  return <DemoLesson />;
}

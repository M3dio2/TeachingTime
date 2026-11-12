import type { Metadata } from "next";
import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create a free teacher account",
  description:
    "Set up a classroom for each student in a minute. Free while TeachingTime is new: video, whiteboard, text pad, PDFs, Word files and audio in one tab.",
  alternates: { canonical: "/signup" },
};

// Logged-in teachers are redirected to /dashboard by proxy.ts.
export default function SignupPage() {
  return <SignupForm />;
}

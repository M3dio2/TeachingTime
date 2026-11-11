import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Teacher login",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

// Logged-in teachers are redirected to /dashboard by proxy.ts.
export default function LoginPage() {
  return <LoginForm />;
}

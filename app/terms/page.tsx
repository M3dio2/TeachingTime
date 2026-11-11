import type { Metadata } from "next";
import LegalPage, { H2, List } from "@/components/legal/LegalPage";
import { CONTACT_EMAIL, OPERATOR, OPERATOR_ADDRESS } from "@/lib/legal";
import { MAX_CLASSROOMS, MAX_LESSON_HOURS, MONTHLY_LESSON_HOURS } from "@/lib/limits";
import { MB, TEACHER_BYTES } from "@/lib/files/uploadResource";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms for using TeachingTime, a free online classroom for one-to-one lessons, and its limits while it is new.",
  alternates: { canonical: "/terms" },
};

// Draft (G1 step 6): have a person check it before relying on it.
export default function Terms() {
  return (
    <LegalPage title="Terms of use">
      <p>
        TeachingTime is run by {OPERATOR}. By creating a teacher account or joining a lesson you agree to these
        terms.
      </p>

      <H2>A free early version</H2>
      <p>
        TeachingTime is new and free while we find out what teachers need. It can change, have bugs or be
        unavailable, and we may stop it (we&apos;d tell you by email first, so you can download your files). It is
        provided as it is, without guarantees.
      </p>

      <H2>Limits while it&apos;s free</H2>
      <List>
        <li>{MAX_CLASSROOMS} classrooms per teacher</li>
        <li>
          {TEACHER_BYTES / MB} MB of files per teacher, up to 10 MB per file
        </li>
        <li>
          {MONTHLY_LESSON_HOURS} hours of lessons a month per teacher, up to {MAX_LESSON_HOURS} hours per lesson
        </li>
      </List>

      <H2>Your account and content</H2>
      <List>
        <li>Keep your password to yourself; you&apos;re responsible for what happens in your account.</li>
        <li>
          What you upload or write stays yours. You give us only the permission needed to store it and show it in
          your lessons.
        </li>
        <li>Upload only material you&apos;re allowed to use (for example, your own or licensed for teaching).</li>
      </List>

      <H2>Not allowed</H2>
      <List>
        <li>Anything illegal, hateful, or harmful to children</li>
        <li>Harassing or recording people without their consent</li>
        <li>Trying to break, overload or get around the limits of the service, or using it to send spam</li>
      </List>
      <p>We may close accounts that do this.</p>

      <H2>Law</H2>
      <p>Swiss law applies, as far as the law of your country allows.</p>

      <H2>Contact</H2>
      <address className="not-italic">
        {OPERATOR}
        {OPERATOR_ADDRESS.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
          {CONTACT_EMAIL}
        </a>
      </address>
    </LegalPage>
  );
}

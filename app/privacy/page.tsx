import type { Metadata } from "next";
import LegalPage, { H2, List } from "@/components/legal/LegalPage";
import { CONTACT_EMAIL, OPERATOR, OPERATOR_ADDRESS } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy policy · TeachingTime" };

// Draft (G1 step 6): written from what the code does; have a person check it before relying on it.
export default function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        TeachingTime is a tool for one-to-one online lessons. It is run by {OPERATOR}, who is responsible for your
        data:
      </p>
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
      <p>
        This policy follows the Swiss Federal Act on Data Protection (FADP) and, for people in the EU, the GDPR.
      </p>

      <H2>What we store</H2>
      <List>
        <li>
          <strong>Teachers:</strong> email address, password (stored scrambled, never readable), the name shown in
          lessons, and the classrooms you create (a student&apos;s name or nickname, the invite link).
        </li>
        <li>
          <strong>Lesson content:</strong> the text pad and whiteboard of each classroom, writing on PDFs, and the
          files you upload (pictures, PDFs, audio), until you delete them or remove the classroom.
        </li>
        <li>
          <strong>Lesson times:</strong> when each lesson&apos;s call started and ended, to apply the free plan&apos;s
          limits.
        </li>
        <li>
          <strong>Feedback</strong> you send us, and technical error reports (page, browser, error message) when
          something breaks.
        </li>
        <li>
          <strong>Students</strong> don&apos;t need an account. The name a student types to join is only used during the
          call and isn&apos;t stored.
        </li>
      </List>

      <H2>Video and sound</H2>
      <p>
        Camera, microphone and screen sharing go through LiveKit, our video provider, directly between the two
        people in the lesson. Calls are <strong>not recorded</strong> and not stored.
      </p>

      <H2>Who helps us run it</H2>
      <List>
        <li>Vercel (website hosting, and anonymous page-view counts without cookies), USA</li>
        <li>Supabase (accounts, database and file storage), USA</li>
        <li>LiveKit (video calls), servers worldwide, nearest to each person</li>
        <li>Cloudflare Turnstile (checks that sign-ups and logins aren&apos;t bots)</li>
        <li>An email provider, to send sign-up and password emails</li>
      </List>
      <p>They process data only to provide their service to us. Some of them are outside Switzerland and the EU (mainly
        in the USA); we rely on their standard contractual clauses or data privacy frameworks for this.</p>

      <H2>Cookies</H2>
      <p>
        Only one kind: the login cookie that keeps teachers signed in. No advertising or tracking cookies. Your
        browser also remembers layout choices (like panel sizes) on your own device.
      </p>

      <H2>How long</H2>
      <p>
        As long as your account exists. Removing a classroom deletes its board and files. To delete your account and
        everything in it, write to {CONTACT_EMAIL}; we do it within 30 days.
      </p>

      <H2>Your rights</H2>
      <p>
        You can ask to see, correct, export or delete your data, and you can complain to a data protection
        authority (in Switzerland the FDPIC, in the EU the one where you live). Write to {CONTACT_EMAIL}.
      </p>

      <H2>Students under 16</H2>
      <p>
        Teachers invite their students. If a student is a child, the teacher is responsible for having the
        parents&apos; permission for online lessons, and should use a first name or nickname for the classroom.
      </p>

      <H2>Changes</H2>
      <p>If this policy changes, the date above changes; important changes are announced by email.</p>
    </LegalPage>
  );
}

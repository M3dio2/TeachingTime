import {
  ArrowRight,
  AudioLines,
  Check,
  FileType2,
  Link2,
  type LucideIcon,
  PenLine,
  School,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RoomDrawing } from "@/components/auth/AuthCard";
import { buttonClass } from "@/components/ui/Button";
import Marker from "@/components/ui/Marker";
import Wordmark from "@/components/ui/Wordmark";
import { MB, TEACHER_BYTES } from "@/lib/files/uploadResource";
import { CONTACT_EMAIL } from "@/lib/legal";
import { MAX_CLASSROOMS, MONTHLY_LESSON_HOURS } from "@/lib/limits";
import { DESCRIPTION, SITE_NAME, SITE_URL, TAGLINE } from "@/lib/site";

// The start page (SEO, G2): what TeachingTime is, for teachers who find it in a search or a
// shared link. Static (prerendered), no client JavaScript of its own. Logged-in teachers never
// see it: proxy.ts sends them to their classrooms.
export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME}: ${TAGLINE.toLowerCase()}` },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
};

const FEATURES: { Icon: LucideIcon; title: string; text: string }[] = [
  {
    Icon: School,
    title: "A classroom for every student",
    text: "Their files, notes and whiteboard stay put between lessons, so the next one starts where the last one ended.",
  },
  {
    Icon: Link2,
    title: "Students join with a link",
    text: "No account, no app. Your student opens the link, checks their camera and is in the room.",
  },
  {
    Icon: PenLine,
    title: "Write on your PDFs together",
    text: "Pen, highlighter and text on any page, for both of you. Save the result as a new PDF afterwards.",
  },
  {
    Icon: FileType2,
    title: "Word files and a shared text pad",
    text: "Open your .docx worksheets in the call, or copy them into the text pad and fill the gaps together.",
  },
  {
    Icon: AudioLines,
    title: "Audio for both of you",
    text: "Play listening exercises straight into the call. No more “can you hear it now?”",
  },
  {
    Icon: Users,
    title: "You lead, they follow",
    text: "Your student sees the tab and the page you show. A whiteboard and screen sharing are one click away, and you decide when they may write.",
  },
];

const STEPS = [
  { title: "Add a classroom", text: "One per student. Upload the PDFs, Word files, pictures and audio you teach with." },
  { title: "Send the link", text: "Each classroom has its own link. Send it once: it stays the same for every lesson." },
  { title: "Teach", text: "Start the lesson, open a file, draw, talk. Your student follows what you show." },
];

const FAQ = [
  {
    q: "Is TeachingTime free?",
    a: `Yes, while it's new. A free account has ${MAX_CLASSROOMS} classrooms, ${TEACHER_BYTES / MB} MB of files and ${MONTHLY_LESSON_HOURS} hours of lessons a month.`,
  },
  {
    q: "Does my student need an account?",
    a: "No. Students open the link you send them, type their name and join. Only teachers have accounts.",
  },
  {
    q: "What do we need?",
    a: "A computer, tablet or phone with a current browser (Chrome, Edge, Safari or Firefox), a camera and a microphone. Nothing to install. Teachers get the most out of a computer.",
  },
  {
    q: "Which files can I use?",
    a: "PDFs, Word files (.docx), pictures (JPG, PNG, WebP, GIF) and audio (MP3, M4A, WAV and more), up to 10 MB each. Plus links: YouTube videos play for both of you, in sync.",
  },
  {
    q: "Are lessons recorded?",
    a: "No. Video and sound go between the two of you and are never stored. What stays is what you write and upload, until you delete it.",
  },
  {
    q: "Who is it for?",
    a: "Anyone who teaches one person at a time online: language teachers, tutors, music and maths teachers, coaches.",
  },
];

// Structured data: what kind of thing this is, its price and the questions above.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: SITE_URL,
      description: DESCRIPTION,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "A current browser with camera and microphone access",
      inLanguage: "en",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: FEATURES.map((f) => f.title),
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: SITE_NAME,
      url: SITE_URL,
      email: CONTACT_EMAIL,
      logo: `${SITE_URL}/icon.svg`,
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ],
};

const section = "mx-auto w-full max-w-[1120px] px-[clamp(16px,4vw,32px)]";
const h2 = "font-display text-[clamp(28px,3.6vw,40px)] leading-[1.1] font-extrabold tracking-[-0.02em] text-balance";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <header className={`${section} flex items-center justify-between gap-4 py-5`}>
        <Link
          href="/"
          aria-label="TeachingTime, start page"
          className="rounded-md focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <Wordmark underline="none" />
        </Link>
        <nav aria-label="Account" className="flex items-center gap-1.5">
          <Link href="/login" className={buttonClass("ghost", "sm", "h-9 text-ink!")}>
            Log in
          </Link>
          <Link href="/signup" className={buttonClass("primary", "sm", "h-9 px-3.5")}>
            Sign up free
          </Link>
        </nav>
      </header>

      <main className="flex flex-col gap-20 pb-20 md:gap-28">
        {/* Hero */}
        <section className={`${section} flex flex-wrap items-center gap-x-14 gap-y-10 pt-6 md:pt-14`}>
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
            <p className="text-sm font-semibold tracking-wide text-accent uppercase">For tutors and language teachers</p>
            <h1 className="font-display text-[clamp(36px,5.4vw,60px)] leading-[1.04] font-extrabold tracking-[-0.025em]">
              One calm room for{" "}
              <span className="relative isolate inline-block whitespace-nowrap">
                one-to-one
                <Marker shape="underline" delay={0.3} className="absolute -bottom-[0.12em] left-0 -z-10 h-[0.32em] w-full" />
              </span>{" "}
              lessons
            </h1>
            <p className="max-w-[540px] text-lg leading-relaxed text-ink-muted md:text-xl">
              Face to face online, with your material on the table: write on your PDFs together, share a whiteboard
              and a text pad, play audio for both. Your student just opens a link.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/signup" className={buttonClass("primary", "md", "h-12 px-6 text-base font-semibold")}>
                Create your free classroom
                <ArrowRight size={18} aria-hidden />
              </Link>
              <Link href="/login" className={buttonClass("secondary", "md", "h-12 px-5 text-base")}>
                Log in
              </Link>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-muted">
              {["Free while it's new", "Nothing to install", "Students need no account"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check size={16} strokeWidth={2.5} aria-hidden className="text-ok" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex min-w-0 flex-[1_1_420px] justify-center">
            <figure className="flex w-full max-w-[560px] flex-col gap-3">
              <RoomDrawing />
              <figcaption className="text-center text-sm text-ink-muted">
                Both cameras on the left, your worksheet and the whiteboard side by side.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* Features */}
        <section aria-labelledby="features" className={`${section} flex flex-col gap-10`}>
          <div className="flex max-w-[720px] flex-col gap-3">
            <h2 id="features" className={h2}>
              Everything a lesson needs, in one tab
            </h2>
            <p className="text-lg text-ink-muted">
              No more juggling a video call, a shared document and a screen share. TeachingTime puts them in one room
              that both of you see the same way.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icon, title, text }) => (
              <li key={title} className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-accent">
                  <Icon size={22} aria-hidden />
                </span>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="leading-relaxed text-ink-muted">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section aria-labelledby="how" className={`${section} flex flex-col gap-10`}>
          <h2 id="how" className={h2}>
            Ready in three steps
          </h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-2.5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink font-display text-lg font-extrabold text-marker">
                  {i + 1}
                </span>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="leading-relaxed text-ink-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Privacy */}
        <section className={section}>
          <div className="flex flex-wrap items-start gap-5 rounded-panel border border-line bg-surface-2 p-6 md:p-8">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-accent">
              <ShieldCheck size={22} aria-hidden />
            </span>
            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
              <h2 className="text-xl font-semibold">Calm about privacy, too</h2>
              <p className="leading-relaxed text-ink-muted">
                Lessons are never recorded. No ads, no tracking cookies. Students don&apos;t need an account, and their
                name isn&apos;t stored. Made independently in Switzerland.{" "}
                <Link href="/privacy" className="font-medium text-accent underline-offset-2 hover:underline">
                  Read the privacy policy
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq" className={`${section} flex flex-col gap-8`}>
          <h2 id="faq" className={h2}>
            Questions teachers ask
          </h2>
          <div className="grid gap-x-10 gap-y-7 md:grid-cols-2">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="flex flex-col gap-1.5">
                <h3 className="text-lg font-semibold">{q}</h3>
                <p className="leading-relaxed text-ink-muted">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final call */}
        <section className={section}>
          <div className="flex flex-col items-center gap-5 rounded-panel bg-ink px-6 py-12 text-center text-paper md:py-16">
            <h2 className={h2}>Your next lesson could start here</h2>
            <p className="max-w-[520px] text-lg text-paper/80">
              Create a classroom, send the link, teach. It takes about a minute.
            </p>
            <Link
              href="/signup"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-marker px-6 text-base font-semibold text-ink hover:bg-marker-soft focus-visible:ring-2 focus-visible:ring-marker focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none"
            >
              Create your free classroom
              <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className={`${section} flex flex-wrap items-center justify-between gap-4 py-8 text-sm text-ink-muted`}>
          <Wordmark size="sm" underline="none" />
          <nav aria-label="About" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-ink">
              {CONTACT_EMAIL}
            </a>
            <span>Made in Switzerland</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}

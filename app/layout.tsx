import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import { DESCRIPTION, SHARE_DESCRIPTION, SITE_NAME, SITE_URL, TAGLINE } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Display face: the TeachingTime name and page headings only (docs/DESIGN.md).
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: ${TAGLINE.toLowerCase()}`, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "online tutoring",
    "one-to-one lessons",
    "online classroom",
    "virtual classroom for tutors",
    "language teacher",
    "shared whiteboard",
    "video lessons",
  ],
  // The preview a link gets in WhatsApp, Mail or Messages (image: app/opengraph-image.tsx).
  openGraph: {
    title: `${SITE_NAME}: ${TAGLINE.toLowerCase()}`,
    description: SHARE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    type: "website",
    locale: "en",
  },
  twitter: { card: "summary_large_image", title: `${SITE_NAME}: ${TAGLINE.toLowerCase()}`, description: SHARE_DESCRIPTION },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#faf6f0" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Browser extensions (e.g. LanguageTool) add attributes to <html> before hydration.
      suppressHydrationWarning
      className={`${geistSans.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Page views, no cookies (G1). Switched on in Vercel: project → Analytics. Production
            only: in dev it loads a debug script from another site, which the CSP blocks. */}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}

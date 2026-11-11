import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
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
  title: "TeachingTime",
  description: "1-on-1 English lessons with video, screen share, a shared text pad and whiteboard.",
};

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

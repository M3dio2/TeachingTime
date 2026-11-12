import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Search engines: the public pages only. The app itself (classrooms, lessons, join links) is
// private; those pages also say noindex.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/lesson/", "/join/", "/api/", "/auth/", "/reset-password", "/link-expired"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

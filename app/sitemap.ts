import type { MetadataRoute } from "next";
import { LEGAL_UPDATED } from "@/lib/legal";
import { SITE_URL } from "@/lib/site";

// The pages worth finding in a search.
export default function sitemap(): MetadataRoute.Sitemap {
  const legal = new Date(LEGAL_UPDATED);
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/signup`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/privacy`, lastModified: legal, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: legal, changeFrequency: "yearly", priority: 0.3 },
  ];
}

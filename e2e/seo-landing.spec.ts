import { expect, test } from "@playwright/test";

// SEO: the start page explains TeachingTime and leads to sign-up and login; search engines get
// titles, descriptions, canonical links, structured data, robots.txt, a sitemap and a share image.

test("start page: content, links, metadata", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("TeachingTime: one calm room for one-to-one lessons");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/One calm room for\s+one-to-one\s+lessons/);
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(5);
  const desc = await page.locator('meta[name="description"]').getAttribute("content");
  expect(desc!.length).toBeGreaterThan(110);
  expect(desc!.length).toBeLessThanOrEqual(160);
  expect(desc).not.toMatch(/english/i);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://teachingtime.app");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld["@graph"].map((n: { "@type": string }) => n["@type"])).toEqual(["WebApplication", "Organization", "FAQPage"]);

  await page.getByRole("link", { name: "Create your free classroom" }).first().click();
  await expect(page).toHaveURL(/\/signup$/);
  await page.getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Teacher login" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("robots.txt, sitemap, share image, join link preview", async ({ request, page }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /dashboard");
  expect(robots).toContain("Sitemap: https://teachingtime.app/sitemap.xml");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("<loc>https://teachingtime.app/signup</loc>");
  const img = await request.get("/opengraph-image");
  expect(img.ok()).toBe(true);
  expect(img.headers()["content-type"]).toBe("image/png");

  await page.goto("/join/abcdefgh12");
  await expect(page).toHaveTitle("Join your lesson · TeachingTime");
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", /no account, no download/);
});

test("logged-out visitors of the app go to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

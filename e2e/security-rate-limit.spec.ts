import { expect, test } from "@playwright/test";

// H4: the API routes answer 429 once a caller goes over the limit (lib/rateLimit.ts).
// Uses /api/resource-url (120 a minute per IP) with requests it refuses anyway, so no
// lesson or file is touched. Runs before security-token.spec.ts, which uses another route.

test("rate limit: /api/resource-url says 429 after 120 requests a minute", async ({ request }) => {
  test.setTimeout(120_000);
  const statuses: number[] = [];
  for (let i = 0; i < 125; i++) {
    const res = await request.post("/api/resource-url", { data: { slug: "x", id: "y" } });
    statuses.push(res.status());
  }
  // Earlier tests in the same minute may have used some of the allowance already.
  expect(statuses.filter((s) => s === 400).length).toBeLessThanOrEqual(120);
  expect(statuses.at(-1)).toBe(429);
  const last = await request.post("/api/resource-url", { data: { slug: "x", id: "y" } });
  expect(last.status()).toBe(429);
  expect(last.headers()["retry-after"]).toBe("60");
});

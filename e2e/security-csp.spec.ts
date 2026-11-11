import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import {
  deleteTestFiles,
  openTestClassroom,
  startTestLesson,
  TEST_PNG,
  testPdf,
  testWav,
  uploadToClassroom,
} from "./helpers";

// H3: the Content-Security-Policy (next.config.ts) must not block anything the app itself does.
// Every page records its CSP violations; the test walks the main flows on both sides and expects
// none. Run it against a production build too (`next start`), where the policy is strictest.

async function recordViolations(context: BrowserContext) {
  await context.addInitScript(() => {
    const list: string[] = [];
    (window as unknown as { __csp: string[] }).__csp = list;
    document.addEventListener("securitypolicyviolation", (e) =>
      list.push(`${e.effectiveDirective} ${e.blockedURI || "(inline)"}`),
    );
  });
}
const violations = (p: Page) =>
  p.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);

test("CSP: the main flows cause no violations", async ({ page, browser }) => {
  test.setTimeout(180_000);
  await recordViolations(page.context());
  const header = (await page.request.get("/")).headers()["content-security-policy"] ?? "";
  expect(header).toContain("script-src 'self'");
  expect(header).toContain("connect-src 'self'");

  const stamp = Date.now();
  await page.setViewportSize({ width: 1440, height: 900 });
  const seen: string[] = [];
  const joinPath = await startTestLesson(page, async (p) => {
    await deleteTestFiles(p);
    await uploadToClassroom(p, `e2e-${stamp}.pdf`, "application/pdf", testPdf(2));
    await uploadToClassroom(p, `e2e-${stamp}.png`, "image/png", TEST_PNG);
    await uploadToClassroom(p, `e2e-${stamp}.wav`, "audio/wav", testWav(3));
    // The classroom page: thumbnails and "Listen" use signed Supabase URLs.
    await p.getByRole("button", { name: new RegExp(`^Listen to e2e-${stamp}`) }).click();
    await p.waitForTimeout(800);
    seen.push(...(await violations(p)));
  });

  try {
    const studentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await recordViolations(studentContext);
    const student = await studentContext.newPage();
    await student.goto(joinPath);
    await student.getByLabel("Your name").fill("E2E Student");
    await student.getByRole("button", { name: "Join lesson" }).click();
    await expect(student.getByText(/^Following /).first()).toBeVisible({ timeout: 30_000 });

    const files = page.getByRole("complementary", { name: "Test's files" });
    // Draw (Excalidraw: fonts, workers, WebAssembly) beside Text.
    await page.getByRole("button", { name: "Open a tab" }).click();
    await page.getByRole("menuitem", { name: /^Draw/ }).click();
    await expect(page.locator(".excalidraw").first()).toBeVisible({ timeout: 30_000 });
    await expect(student.locator(".excalidraw").first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    // A PDF replaces Text (pdf.js and its worker), then a picture.
    await page.getByRole("button", { name: "Close Text" }).click();
    await files.getByRole("button", { name: new RegExp(`e2e-${stamp}\\.pdf`) }).click();
    for (const p of [page, student]) await expect(p.getByText("Page 1 of 2")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Close Draw" }).click();
    await files.getByRole("button", { name: `Open e2e-${stamp}.png` }).click();
    for (const p of [page, student]) {
      await expect(p.getByRole("img", { name: `e2e-${stamp}.png` })).toBeVisible({ timeout: 30_000 });
    }
    // Classroom audio for both (Web Audio + its own track).
    await files.getByRole("button", { name: `Play e2e-${stamp}.wav` }).click();
    await expect(student.getByTestId("audio-bar")).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);

    seen.push(...(await violations(page)), ...(await violations(student)));
    await student.context().close();
  } finally {
    const leave = page.getByRole("button", { name: "Leave the lesson" });
    if (await leave.count()) {
      await leave.click();
      await page.waitForURL("**/dashboard");
    }
    await openTestClassroom(page);
    await deleteTestFiles(page);
  }
  // HMR in dev can report its own; only the app's count.
  expect(seen.filter((v) => !/webpack|turbopack|hmr|_next\/webpack/i.test(v))).toEqual([]);
});

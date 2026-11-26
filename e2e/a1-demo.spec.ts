import { expect, test } from "@playwright/test";

// Review A1: the demo lesson. No account, no call, nothing saved; a pretend student (Lucía)
// who reacts, writes, answers the quiz; a short tour; a way out to sign-up.

test("A1: the demo lesson from the start page, with Lucía and the tour", async ({ browser }) => {
  test.setTimeout(150_000);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } }); // logged out
  const page = await context.newPage();
  const calls: string[] = [];
  page.on("request", (r) => {
    const url = r.url();
    if (url.includes("livekit.cloud") || url.includes("/api/") || (url.includes("supabase") && r.method() !== "GET")) calls.push(url);
  });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) =>
      ((window as unknown as { __v: string[] }).__v ??= []).push(`${e.violatedDirective} ${e.blockedURI}`),
    );
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Try a demo lesson", exact: true }).click();
  await expect(page).toHaveURL(/\/demo$/);

  // Lucía arrives and says hello; the visitor's own tile is a stand-in (no camera asked for).
  const tour = page.getByTestId("demo-tour");
  await expect(tour).toHaveAttribute("data-step", "welcome", { timeout: 30_000 });
  await expect(page.getByTestId("demo-caption")).toContainText("ready for our lesson", { timeout: 10_000 });
  await page.getByRole("button", { name: "Show me around" }).click();

  // 1. The worksheet from her files (a click, as a teacher would).
  await expect(tour).toHaveAttribute("data-step", "worksheet");
  await page.getByRole("complementary", { name: /files$/ }).getByRole("button", { name: /^Worksheet – Past simple/ }).click();
  await expect(page.getByRole("tab", { name: /Worksheet – Past simple/ })).toBeVisible();
  await expect(page.getByTestId("demo-caption")).toContainText("worksheet");

  // 2. Let her write: her sentences appear in the text pad.
  await expect(tour).toHaveAttribute("data-step", "write");
  await page.getByRole("switch", { name: "Lucía can write and draw" }).click();
  await expect(page.getByLabel("Text pad")).toContainText("I bought some bread and I saw my friend Ana.", { timeout: 20_000 });

  // 3. The quiz ("Do it for me" swaps it in): she answers all five, then she's done.
  await expect(tour).toHaveAttribute("data-step", "quiz", { timeout: 10_000 });
  await tour.getByRole("button", { name: "Do it for me" }).click();
  await expect(page.getByRole("tab", { name: "Past simple: irregular verbs" })).toBeVisible();
  await expect(tour).toHaveAttribute("data-step", "check", { timeout: 30_000 });
  await expect(page.getByTestId("quiz")).toContainText("5 of 5 answered");

  // 4. Check: one answer is wrong on purpose.
  await page.getByRole("button", { name: "Check answers" }).click();
  await expect(page.getByTestId("quiz")).toHaveAttribute("data-checked", "yes");
  await expect(page.getByTestId("quiz")).toContainText("8 of 9 right");
  await expect(tour).toHaveAttribute("data-step", "end");
  await expect(tour.getByRole("link", { name: "Create your free Classroom" })).toHaveAttribute("href", "/signup");

  // Leaving: the end page; Try again starts a clean room.
  await page.getByRole("button", { name: "Leave the demo" }).click();
  await expect(page.getByRole("heading", { name: "That was the demo" })).toBeVisible();
  await page.getByRole("button", { name: "Try the demo again" }).click();
  await expect(tour).toHaveAttribute("data-step", "welcome", { timeout: 15_000 });
  await expect(page.getByLabel("Text pad")).not.toContainText("I bought some bread");

  expect(calls).toEqual([]); // no call, no token, nothing written
  expect(await page.evaluate(() => (window as unknown as { __v?: string[] }).__v ?? [])).toEqual([]);
  await context.close();
});

test("A1: the demo works on a phone", async ({ browser }) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto("/demo");
  const tour = page.getByTestId("demo-tour");
  await expect(page.getByTestId("demo-caption")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Show me around" }).click();
  await tour.getByRole("button", { name: "Do it for me" }).click();
  await expect(tour).toHaveAttribute("data-step", "write", { timeout: 10_000 });
  // The tips fold away and come back.
  await tour.getByRole("button", { name: "Hide the tips" }).click();
  await expect(tour).toHaveCount(0);
  await page.getByRole("button", { name: "Tips" }).click();
  await expect(tour).toHaveAttribute("data-step", "write");
  await context.close();
});

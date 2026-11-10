import { expect, test } from "@playwright/test";
import { logIn, startTestLesson } from "./helpers";

// D5d: a wait that takes you into or out of a lesson is one full loading screen.

test("D5d: Start a quick call shows the loading screen at once, until connected", async ({ page }) => {
  test.setTimeout(90_000);
  await logIn(page);
  const loading = page.getByRole("status").filter({ hasText: "Getting your lesson ready" });
  await page.getByRole("button", { name: /Start a (new )?quick call/ }).click();
  await expect(loading).toBeVisible({ timeout: 2_000 });
  // The same screen until the room is there, never the dashboard again in between.
  await expect(page.getByRole("region", { name: "Lesson" })).toBeVisible({ timeout: 30_000 });
  await expect(loading).toHaveCount(0);

  // Leaving (ends the quick call): "Leaving the lesson" until the classrooms are shown.
  await page.getByRole("button", { name: "Leave the lesson" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Leaving the lesson" })).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole("heading", { name: "Your classrooms", exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("status").filter({ hasText: "Leaving the lesson" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Quick call in progress" })).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem("leaving-lesson"))).toBeNull();
});

test("D5d: Start lesson in a classroom shows the loading screen at once", async ({ page }) => {
  test.setTimeout(90_000);
  await startTestLesson(page); // clicks Start lesson and waits for the room
  await page.getByRole("button", { name: "Leave the lesson" }).click();
  await expect(page.getByRole("heading", { name: "Your classrooms", exact: true })).toBeVisible({ timeout: 30_000 });

  // From the dashboard card this time: the loading screen appears within a moment.
  await page.getByRole("link", { name: "Start lesson" }).first().click();
  await expect(page.getByRole("status").filter({ hasText: "Getting your lesson ready" })).toBeVisible({
    timeout: 2_000,
  });
  await expect(page.getByRole("region", { name: "Lesson" })).toBeVisible({ timeout: 30_000 });
});

test("D5d: small actions show a pending state", async ({ page }) => {
  await logIn(page);
  // Slow the server action down a little so the pending label can be seen.
  await page.route("**/dashboard", async (route) => {
    if (route.request().method() === "POST") await new Promise((r) => setTimeout(r, 800));
    await route.continue();
  });
  await page.getByRole("button", { name: /^Your name in lessons: / }).click();
  const field = page.getByRole("textbox", { name: "Your name in lessons" });
  const name = await field.inputValue();
  await field.fill(name); // unchanged
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saving…" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Saving…" })).toHaveCount(0, { timeout: 15_000 });
});

import { type Browser, expect, type Page } from "@playwright/test";

// The only classroom tests may use (AGENTS.md: Playwright only joins the lesson "Test").
export const TEST_CLASSROOM = "Test";

export async function logIn(page: Page) {
  const email = process.env.E2E_TEACHER_EMAIL;
  const password = process.env.E2E_TEACHER_PASSWORD;
  if (!email || !password) {
    throw new Error("Set E2E_TEACHER_EMAIL and E2E_TEACHER_PASSWORD in .env.local (the test teacher account).");
  }
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/dashboard");
}

// Opens the test teacher's "Test" classroom, adding it first if it doesn't exist yet.
export async function openTestClassroom(page: Page) {
  const card = page.getByRole("link", { name: `Open ${TEST_CLASSROOM}'s classroom` });
  await expect(page.getByRole("heading", { name: "Your classrooms" })).toBeVisible();
  if (!(await card.count())) {
    await page.getByLabel("Student's name").fill(TEST_CLASSROOM);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(card).toBeVisible();
  }
  // The corner: on a phone-sized window the card's buttons cover its middle.
  await card.click({ position: { x: 8, y: 8 } });
  await page.waitForURL(/\/dashboard\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Files" })).toBeVisible({ timeout: 30_000 });
}

// Teacher: opens the "Test" classroom, reads its student link and starts the lesson.
// Returns the student's join path (/join/<slug>).
export async function startTestLesson(page: Page) {
  await logIn(page);
  await openTestClassroom(page);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy student link" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  await page.getByRole("link", { name: "Start lesson" }).click();
  await page.waitForURL(/\/lesson\/[0-9a-f-]+$/);
  await expect(page.getByRole("region", { name: "Lesson" })).toBeVisible({ timeout: 30_000 });
  return new URL(link).pathname;
}

// Student: a fresh browser context (no login) that joins with the link.
export async function joinAsStudent(
  browser: Browser,
  joinPath: string,
  viewport = { width: 1440, height: 900 },
) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(joinPath);
  await page.getByLabel("Your name").fill("E2E Student");
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByText(/^Following /).first()).toBeVisible({ timeout: 30_000 });
  return page;
}

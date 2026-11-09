import { expect, type Page } from "@playwright/test";

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
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/dashboard");
}

// Opens the test teacher's "Test" classroom, adding it first if it doesn't exist yet.
export async function openTestClassroom(page: Page) {
  const card = page.getByRole("link", { name: `Open ${TEST_CLASSROOM}'s classroom` });
  await expect(page.getByRole("heading", { name: "Your classrooms" })).toBeVisible();
  if (!(await card.count())) {
    await page.getByLabel("Add a classroom").fill(TEST_CLASSROOM);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(card).toBeVisible();
  }
  await card.click();
  await page.waitForURL(/\/dashboard\/[0-9a-f-]+$/);
}

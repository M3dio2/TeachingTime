import { expect, test } from "@playwright/test";
import { logIn, startTestLesson } from "./helpers";

// I1: the teacher picks her language in the dashboard header (saved in a cookie and her
// account); a student without account gets her browser's language. Always back to English at
// the end, since the choice is stored on the shared test account.
test.afterEach(async ({ page }) => {
  await page.goto("/dashboard");
  const menu = page.getByRole("button", { name: /^(Language|Sprache|Idioma|Langue):/ });
  await menu.click();
  await page.getByRole("menuitemradio", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Your Classrooms", exact: true })).toBeVisible();
});

test("I1: a Spanish browser joins in Spanish; the teacher switches the dashboard to German", async ({ page, browser }) => {
  test.setTimeout(150_000);
  // A student whose browser speaks Spanish (the teacher stays English).
  const joinPath = await startTestLesson(page);
  const student = await browser.newContext({ locale: "es-ES" });
  const s = await student.newPage();
  await s.goto(joinPath);
  await s.getByLabel("Tu nombre").fill("E2E Student");
  await s.getByRole("button", { name: "Unirme a la clase" }).click();
  await expect(s.getByRole("tab", { name: "Texto" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("tab", { name: "Text" })).toBeVisible();
  await student.close();
  await page.getByRole("button", { name: "Leave the lesson" }).click();

  // The teacher picks German in the dashboard header.
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Language: English" }).click();
  await page.getByRole("menuitemradio", { name: "Deutsch" }).click();
  await expect(page.getByRole("heading", { name: "Deine Classrooms", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await page.getByRole("button", { name: /^Konto: / }).click();
  await expect(page.getByRole("button", { name: "Abmelden" })).toBeVisible();

  // Still German after a reload, and on another device (from her account).
  await page.reload();
  await expect(page.getByRole("heading", { name: "Deine Classrooms", exact: true })).toBeVisible();
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await logIn(otherPage).catch(() => {}); // logIn waits for English texts; only the dashboard matters
  await otherPage.goto("/dashboard");
  await expect(otherPage.getByRole("heading", { name: "Deine Classrooms", exact: true })).toBeVisible();
  await other.close();
});

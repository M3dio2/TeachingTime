import { expect, type Page, test } from "@playwright/test";
import {
  confirmYes,
  deleteTestFiles,
  joinAsStudent,
  logIn,
  openTestClassroom,
  pdfAt,
  TEST_CLASSROOM,
  TEST_PNG,
  testPdf,
  uploadToClassroom,
} from "./helpers";

// The Library (migration 0019): upload once (books bigger than 10 MB), choose the Classrooms
// with the picker, the file shows in the Classroom and opens in the lesson for both; a
// Classroom file moved to the Library; several files deleted at once.

async function clearLibrary(page: Page) {
  await page.goto("/dashboard/library");
  const list = page.getByRole("list", { name: "Library" });
  const leftovers = list.getByRole("listitem").filter({ hasText: /e2e-/ });
  if (!(await leftovers.count())) return;
  for (const box of await leftovers.getByRole("checkbox").all()) await box.check();
  await page.getByRole("region", { name: /files? selected/ }).getByRole("button", { name: "Delete" }).click();
  await confirmYes(page);
  await expect(leftovers).toHaveCount(0, { timeout: 30_000 });
}

test("L3: a book in the Library, picked for the Test Classroom, opens in the lesson", async ({ page, browser }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await logIn(page);
  await clearLibrary(page);

  // A 12 MB "book": too big for a Classroom, fine for the Library.
  const name = `e2e-${Date.now()}-book.pdf`;
  const book = Buffer.concat([testPdf(3), Buffer.alloc(12 * 1024 * 1024, 0x20)]);
  await page.locator('input[type="file"]').setInputFiles({ name, mimeType: "application/pdf", buffer: book });
  const row = page.getByRole("list", { name: "Library" }).getByRole("listitem").filter({ hasText: name });
  await expect(row).toBeVisible({ timeout: 90_000 });
  await expect(row).toContainText("12.0 MB");

  // Where: nowhere yet → the picker: search, tick Test, save.
  await row.getByRole("button", { name: `Choose the Classrooms for ${name}` }).click();
  const picker = page.getByRole("dialog", { name: `Classrooms for ${name}` });
  await expect(picker.getByRole("switch", { name: /All Classrooms/ })).toHaveAttribute("aria-checked", "false");
  const search = picker.getByRole("searchbox", { name: "Find a Classroom" });
  if (await search.count()) await search.fill(TEST_CLASSROOM);
  await picker.getByRole("checkbox", { name: TEST_CLASSROOM, exact: true }).check();
  await expect(picker.getByText(/^1 of \d+ selected$/)).toBeVisible();
  await picker.getByRole("button", { name: "Save" }).click();
  await expect(picker).toHaveCount(0);
  await expect(row.getByRole("button", { name: `Choose the Classrooms for ${name}` })).toContainText(/^In 1 of \d+ Classrooms$/, { timeout: 15_000 });

  // The Classroom shows it under "From your Library".
  await page.goto("/dashboard");
  await openTestClassroom(page);
  const shared = page.getByRole("region", { name: "From your Library" });
  await expect(shared.getByRole("listitem").filter({ hasText: name })).toBeVisible();

  // In the lesson: in the files panel; opening it shows it to both (via the student's link).
  const link = await page.getByRole("textbox", { name: /'s link$/ }).inputValue();
  await page.getByRole("link", { name: "Start lesson" }).click();
  await page.waitForURL(/\/lesson\/[0-9a-f-]+$/);
  const student = await joinAsStudent(browser, new URL(`http://${link}`).pathname);
  try {
    const files = page.getByRole("complementary", { name: `${TEST_CLASSROOM}'s files`, exact: true });
    await files.getByRole("button", { name: new RegExp(name) }).click();
    for (const p of [page, student]) await expect(pdfAt(p)).toHaveAttribute("data-at", "1/3", { timeout: 60_000 });
  } finally {
    await student.context().close();
  }
  await page.getByRole("button", { name: "Leave the lesson" }).click();
  await page.waitForURL("**/dashboard");

  // Take it out of the Classroom again, then delete it from the Library.
  await openTestClassroom(page);
  await shared.getByRole("button", { name: `Take ${name} out of ${TEST_CLASSROOM}'s Classroom` }).click();
  await expect(shared.getByRole("listitem").filter({ hasText: name })).toHaveCount(0, { timeout: 15_000 });
  await clearLibrary(page);
});

test("L3: a Classroom file moved to the Library stays in the Classroom", async ({ page }) => {
  test.setTimeout(150_000);
  await logIn(page);
  await clearLibrary(page);
  await page.goto("/dashboard");
  await openTestClassroom(page);
  await deleteTestFiles(page);
  const name = `e2e-${Date.now()}.png`;
  await uploadToClassroom(page, name, "image/png", TEST_PNG);
  await page.getByRole("button", { name: `Move ${name} to the Library (stays in this Classroom)` }).click();
  const shared = page.getByRole("region", { name: "From your Library" });
  await expect(shared.getByRole("listitem").filter({ hasText: name })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('section[aria-labelledby="files"]').getByRole("listitem").filter({ hasText: name })).toHaveCount(0);

  await page.goto("/dashboard/library");
  const row = page.getByRole("list", { name: "Library" }).getByRole("listitem").filter({ hasText: name });
  await expect(row).toContainText(/In 1 of \d+ Classrooms/);
  // "All Classrooms" in the picker.
  await row.getByRole("button", { name: `Choose the Classrooms for ${name}` }).click();
  const picker = page.getByRole("dialog", { name: `Classrooms for ${name}` });
  await picker.getByRole("switch", { name: /All Classrooms/ }).click();
  await picker.getByRole("button", { name: "Save" }).click();
  await expect(row).toContainText("In all Classrooms", { timeout: 15_000 });
  await clearLibrary(page);
});

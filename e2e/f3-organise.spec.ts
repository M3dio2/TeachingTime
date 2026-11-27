import { expect, test } from "@playwright/test";
import { clearTestLessons, confirmYes, deleteTestFiles, logIn, openTestClassroom, TEST_CLASSROOM, TEST_PNG, testPdf, uploadToClassroom } from "./helpers";

// F3: files stay findable. The Library has folders (0021); a Classroom's files are grouped by
// lesson (the next one first, with its planned day).

const two = (n: number) => String(n).padStart(2, "0");

test("F3: Library folders: new folder, upload into it, move a file, delete the folder", async ({ page }) => {
  test.setTimeout(150_000);
  await logIn(page);
  await page.goto("/dashboard/library");
  const bar = page.getByRole("group", { name: "Folders" });
  // Leftovers from an earlier run.
  for (const old of await bar.getByRole("button", { name: /^e2e-folder/ }).all()) {
    await old.click();
    await page.getByRole("button", { name: "Delete folder" }).click();
    await confirmYes(page);
    await expect(bar.getByRole("button", { name: "All files" })).toHaveAttribute("aria-pressed", "true");
  }

  const folder = `e2e-folder ${Date.now()}`;
  await bar.getByRole("button", { name: "New folder" }).click();
  await page.getByRole("textbox", { name: "Folder name" }).fill(folder);
  await page.getByRole("button", { name: "Save" }).click();
  const chip = bar.getByRole("button", { name: new RegExp(`^${folder}`) });
  await expect(chip).toHaveAttribute("aria-pressed", "true", { timeout: 15_000 });

  // Uploads go into the open folder.
  const inside = `e2e-${Date.now()}-inside.pdf`;
  await page.locator('input[type="file"]').setInputFiles({ name: inside, mimeType: "application/pdf", buffer: testPdf(1) });
  const list = page.getByRole("list", { name: "Library" });
  await expect(list.getByRole("listitem").filter({ hasText: inside })).toBeVisible({ timeout: 30_000 });
  await expect(chip).toContainText("1");

  // A file uploaded under All files, moved into the folder.
  await bar.getByRole("button", { name: /^All files/ }).click();
  const outside = `e2e-${Date.now()}-outside.png`;
  await page.locator('input[type="file"]').setInputFiles({ name: outside, mimeType: "image/png", buffer: TEST_PNG });
  const row = list.getByRole("listitem").filter({ hasText: outside });
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.getByRole("button", { name: `Move ${outside} to a folder` }).click();
  await page.getByRole("dialog", { name: `Move ${outside} to` }).getByRole("button", { name: folder }).click();
  await expect(chip).toContainText("2", { timeout: 15_000 });
  await chip.click();
  await expect(list.getByRole("listitem")).toHaveCount(2);

  // Deleting the folder keeps the files.
  await page.getByRole("button", { name: "Delete folder" }).click();
  await confirmYes(page);
  await expect(chip).toHaveCount(0, { timeout: 15_000 });
  await expect(list.getByRole("listitem").filter({ hasText: inside })).toBeVisible();

  // Clean up.
  for (const box of await list.getByRole("listitem").filter({ hasText: /e2e-/ }).getByRole("checkbox").all()) await box.check();
  await page.getByRole("region", { name: /files? selected/ }).getByRole("button", { name: "Delete" }).click();
  await confirmYes(page);
  await expect(list.getByRole("listitem").filter({ hasText: /e2e-/ })).toHaveCount(0, { timeout: 30_000 });
});

test("F3: a Classroom's files are grouped for the next lesson", async ({ page }) => {
  test.setTimeout(150_000);
  await logIn(page);
  await openTestClassroom(page);
  await clearTestLessons(page);
  await deleteTestFiles(page);
  // Without lessons: one plain list.
  const name = `e2e-${Date.now()}.pdf`;
  await uploadToClassroom(page, name, "application/pdf", testPdf(1));
  await expect(page.getByTestId("files-day")).toHaveCount(0);

  // A lesson planned in three days: the file is "for the next lesson" on that day.
  const classroom = page.url();
  await page.getByRole("link", { name: "Plan in the calendar" }).click();
  const dialog = page.getByRole("dialog", { name: "New lesson" });
  const at = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  await dialog.getByLabel("Day").fill(`${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`);
  await dialog.getByLabel("Time").fill("10:00");
  await dialog.getByLabel("Every week").uncheck();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toHaveCount(0, { timeout: 15_000 });
  await page.goto(classroom);
  await expect(page.getByTestId("files-day").first()).toContainText(/For the next lesson · /i);
  await expect(page.getByRole("list", { name: /^Files: / }).getByRole("listitem").filter({ hasText: name })).toBeVisible();

  await clearTestLessons(page);
  await deleteTestFiles(page);
  void TEST_CLASSROOM;
});

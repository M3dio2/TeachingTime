import { expect, test } from "@playwright/test";
import { deleteTestFiles, logIn, openTestClassroom, TEST_CLASSROOM, TEST_PNG, testPdf, uploadToClassroom } from "./helpers";

// S5: the classroom page: link field, storage card, filters, drop area (files are e2e- and
// deleted again; the classroom itself is never removed).

test("S5 classroom: link, storage, filters, drop to upload", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await logIn(page);
  await openTestClassroom(page);
  await deleteTestFiles(page);

  await expect(page.getByRole("heading", { name: TEST_CLASSROOM, level: 1 })).toBeVisible();
  await expect(page.getByRole("textbox", { name: `${TEST_CLASSROOM}'s link` })).toHaveValue(/\/join\/[a-z0-9]+$/);
  await expect(page.getByText(/^\d+ MB of 200 MB$/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove this classroom" })).toBeVisible();

  await uploadToClassroom(page, "e2e-filter.pdf", "application/pdf", testPdf(1));
  // Drop area: a picture dropped from the computer uses the same upload.
  const drop = await page.evaluateHandle((png) => {
    const dt = new DataTransfer();
    dt.items.add(new File([Uint8Array.from(atob(png), (c) => c.charCodeAt(0))], "e2e-dropped.png", { type: "image/png" }));
    return dt;
  }, TEST_PNG.toString("base64"));
  const area = page.getByTestId("drop-area");
  await expect(area).toContainText("Drop files here");
  await area.dispatchEvent("dragover", { dataTransfer: drop });
  await area.dispatchEvent("drop", { dataTransfer: drop });
  await expect(page.getByRole("listitem").filter({ hasText: "e2e-dropped.png" })).toBeVisible({ timeout: 30_000 });

  // Filters: PDFs only hides the pictures.
  await page.getByRole("button", { name: /^PDFs/ }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "e2e-filter.pdf" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "e2e-dropped.png" })).toHaveCount(0);
  await page.getByRole("button", { name: /^All/ }).click();

  await deleteTestFiles(page);
});

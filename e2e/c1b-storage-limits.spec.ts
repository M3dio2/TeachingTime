import { expect, test, type Page } from "@playwright/test";
import { logIn, openTestClassroom } from "./helpers";

const MB = 1024 * 1024;

// The upload error (not Next's hidden route announcer, which is role="alert" too).
const uploadError = (page: Page) => page.locator('p[role="alert"]');

// A valid (empty) PDF, padded to the wanted size with a comment.
function pdf(bytes: number) {
  const head = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n%";
  return Buffer.concat([Buffer.from(head), Buffer.alloc(bytes - head.length, "x")]);
}

async function usedMB(page: Page) {
  const line = page.getByText(/MB of your 200 MB used/);
  const text = (await line.textContent()) ?? "";
  return Number(text.match(/^(\d+) MB/)?.[1]);
}

async function upload(page: Page, name: string, bytes: number) {
  await page.locator('input[type="file"]').setInputFiles({ name, mimeType: "application/pdf", buffer: pdf(bytes) });
}

test("C1b: file and teacher storage limits", async ({ page }) => {
  page.on("dialog", (d) => d.accept()); // "Delete …?" confirms

  await logIn(page);
  await openTestClassroom(page);

  // Leftovers from an earlier failed run would skew the "used" line.
  const leftovers = page.getByRole("listitem").filter({ hasText: /^e2e-/ });
  while (await leftovers.count()) {
    await leftovers.first().getByRole("button", { name: "Delete" }).click();
    await page.waitForTimeout(1500);
  }

  const before = await usedMB(page);
  expect(before).toBeGreaterThanOrEqual(0);

  // Over 10 MB: refused in the browser, nothing added.
  await upload(page, "e2e-too-big.pdf", 15 * MB);
  await expect(uploadError(page)).toHaveText("e2e-too-big.pdf is bigger than 10 MB.");
  await expect(page.getByText("e2e-too-big.pdf", { exact: true })).toHaveCount(0);

  // A normal upload works and the used line rises (2.5 MB: at least 2 MB more, rounded up).
  const name = `e2e-${Date.now()}.pdf`;
  await upload(page, name, 2.5 * MB);
  const row = page.getByRole("listitem").filter({ hasText: name });
  await expect(row).toBeVisible({ timeout: 30_000 });
  await expect(row).toContainText("2.5 MB");
  await expect(uploadError(page)).toHaveCount(0);
  await expect.poll(() => usedMB(page)).toBeGreaterThanOrEqual(before + 2);

  // Delete: the file goes and the used line falls back.
  await row.getByRole("button", { name: "Delete" }).click();
  await expect(row).toHaveCount(0, { timeout: 30_000 });
  await expect.poll(() => usedMB(page)).toBe(before);
});

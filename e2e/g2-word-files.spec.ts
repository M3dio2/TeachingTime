import { expect, test } from "@playwright/test";
import { deleteTestFiles, joinAsStudent, openTestClassroom, startTestLesson, testDocx, uploadToClassroom } from "./helpers";

// G2: Word files. Uploaded in the classroom (old .doc refused with advice), opened in the call
// for both, the student follows the teacher's scrolling, and "Copy into the text pad" puts the
// text where both can edit it.
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

test("G2: a Word file opens in the call; the student follows; copy into the text pad", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const name = `e2e-${Date.now()}.docx`;
  const lines = Array.from({ length: 60 }, (_, i) => `Exercise line ${i + 1}: fill the gap.`);
  await page.setViewportSize({ width: 1440, height: 900 });
  const joinPath = await startTestLesson(page, async (p) => {
    await deleteTestFiles(p);
    // An old .doc is refused with advice; nothing is uploaded.
    await p.locator('input[type="file"]').setInputFiles({ name: "e2e-old.doc", mimeType: "application/msword", buffer: Buffer.from("x") });
    await expect(p.getByText("is an old Word file")).toBeVisible();
    await uploadToClassroom(p, name, DOCX, await testDocx(lines, 3));
    await expect(p.getByRole("heading", { name: "Word files" })).toBeVisible();
  });

  try {
    const student = await joinAsStudent(browser, joinPath);
    const files = page.getByRole("complementary", { name: "Test's files" });
    await files.getByRole("button", { name: new RegExp(name.replace(".", "\\.")) }).click();
    for (const p of [page, student]) {
      await expect(p.getByRole("tab", { name })).toBeVisible({ timeout: 20_000 });
      await expect(p.getByTestId("doc-pages").getByText("Exercise line 1:")).toBeVisible({ timeout: 30_000 });
      await expect(p.getByText("Page 1 of 3")).toBeVisible();
    }

    // The teacher scrolls to the middle; the student's view follows.
    const t = page.getByTestId("doc-scroller");
    await t.evaluate((el) => (el.scrollTop = el.scrollHeight / 2));
    await expect(page.getByText(/Page 2 of 3/)).toBeVisible();
    const s = student.getByTestId("doc-scroller");
    await expect.poll(() => s.evaluate((el) => el.scrollTop / el.scrollHeight), { timeout: 10_000 }).toBeGreaterThan(0.3);

    // Copy into the text pad: Text is open beside it, so it just fills up, for both.
    await page.getByRole("button", { name: "Copy into the text pad" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Copied into the text pad" })).toBeVisible();
    for (const p of [page, student]) {
      await expect(p.getByLabel("Text pad").getByText("Exercise line 60: fill the gap.").first()).toBeVisible({ timeout: 15_000 });
    }
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
});

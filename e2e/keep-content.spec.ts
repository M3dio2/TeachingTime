import { expect, type Page, test } from "@playwright/test";
import { deleteTestFiles, joinAsStudent, openTestClassroom, startTestLesson, testPdf, uploadToClassroom } from "./helpers";

// User report: what's written, drawn or written on a PDF must survive closing or replacing
// its tab, and come back when the tab is opened again (both sides).
const tabs = (p: Page) => p.getByRole("tablist").getByRole("tab");
const pad = (p: Page) => p.getByLabel("Text pad");
const board = (p: Page) => p.getByTestId("whiteboard");

async function dragFileOnto(page: Page, button: ReturnType<Page["getByRole"]>, zone: string) {
  await button.hover();
  await page.mouse.down();
  await page.mouse.move(700, 400, { steps: 5 });
  await expect(page.getByTestId("drop-zones")).toBeVisible();
  await page.waitForTimeout(300);
  const box = (await page.getByTestId(zone).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
}

test("closing or replacing a tab keeps its text, drawing and PDF writing", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const pdfName = `e2e-keep-${Date.now()}.pdf`;
  await page.setViewportSize({ width: 1440, height: 900 });
  const joinPath = await startTestLesson(page, async (p) => {
    await deleteTestFiles(p);
    await uploadToClassroom(p, pdfName, "application/pdf", testPdf(1));
  });
  const student = await joinAsStudent(browser, joinPath);
  try {
    // Text: write, open Draw beside, draw a rectangle.
    const words = `Words to keep ${Date.now()}`;
    await pad(page).click();
    await page.keyboard.type(words);
    await page.getByRole("button", { name: "Open a tab" }).click();
    await page.getByRole("menuitem", { name: /^Draw/ }).click();
    const canvas = page.locator(".excalidraw canvas.interactive");
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    // The board may hold drawings from an earlier run (the lesson is kept for 3 hours).
    await page.waitForTimeout(1000);
    const before = Number(await board(page).getAttribute("data-elements"));
    const after = String(before + 1);
    await page.getByTitle(/^Rectangle/).click();
    const c = (await canvas.boundingBox())!;
    await page.mouse.move(c.x + 120, c.y + 140);
    await page.mouse.down();
    await page.mouse.move(c.x + 260, c.y + 240, { steps: 6 });
    await page.mouse.up();
    await expect(board(page)).toHaveAttribute("data-elements", after, { timeout: 10_000 });
    // Close Draw, then open it again.
    await page.getByRole("button", { name: "Close Draw" }).click();
    await page.getByRole("button", { name: "Open a tab" }).click();
    await page.getByRole("menuitem", { name: /^Draw/ }).click();
    for (const p of [page, student]) await expect(board(p)).toHaveAttribute("data-elements", after, { timeout: 15_000 });

    // Replace Text with the PDF, write on the PDF, then replace the PDF with Text again.
    const files = page.getByRole("complementary", { name: "Test's files" });
    await dragFileOnto(page, files.getByRole("button", { name: new RegExp(pdfName) }), "drop-0");
    for (const p of [page, student]) await expect(tabs(p)).toHaveText([pdfName, "Draw"], { timeout: 20_000 });
    await expect(page.getByText("Page 1 of 1")).toBeVisible({ timeout: 30_000 });
    const toolbar = page.getByRole("toolbar", { name: "Write on the PDF" });
    await toolbar.getByRole("button", { name: "Pen" }).click();
    const ink = (await page.getByTestId("ink-page-1").boundingBox())!;
    await page.mouse.move(ink.x + 100, ink.y + 80);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(ink.x + 100 + i * 20, ink.y + 80 + i * 4);
    await page.mouse.up();
    await expect(page.getByTestId("ink-page-1").locator("path")).toHaveCount(1);

    await page.getByRole("button", { name: `Close ${pdfName}` }).click();
    await page.getByRole("button", { name: "Open a tab" }).click();
    await page.getByRole("menuitem", { name: /^Text/ }).click();
    for (const p of [page, student]) await expect(pad(p)).toContainText(words, { timeout: 15_000 });

    // The PDF again: its writing is still there, for both.
    await page.getByRole("button", { name: "Close Text" }).click();
    await files.getByRole("button", { name: new RegExp(pdfName) }).click();
    for (const p of [page, student]) {
      await expect(p.getByTestId("ink-page-1").locator("path")).toHaveCount(1, { timeout: 20_000 });
    }
  } finally {
    await student.context().close();
    await page.getByRole("button", { name: "Leave the lesson" }).click();
    // The test PDF is on the Classroom page (on the dashboard, an "e2e-" Classroom or quiz
    // would match and has no Delete button: the cleanup hung there).
    await page.goto("/dashboard");
    await openTestClassroom(page);
    await deleteTestFiles(page);
  }
});

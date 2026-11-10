import { expect, type Page, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { deleteTestFiles, joinAsStudent, openTestClassroom, startTestLesson, testPdf, uploadToClassroom } from "./helpers";

// L2b: writing on a PDF tab is shared; "Save as new PDF" puts a copy with the writing in the
// classroom. Files are uploaded to the "Test" classroom and deleted again.

const toolbar = (p: Page) => p.getByRole("toolbar", { name: "Write on the PDF" });
const inkOn = (p: Page, page: number) => p.getByTestId(`ink-page-${page}`);

async function strokeOn(p: Page, page: number) {
  const box = (await inkOn(p, page).boundingBox())!;
  await p.mouse.move(box.x + box.width * 0.2, box.y + 60);
  await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(box.x + box.width * (0.2 + i * 0.05), box.y + 60 + i * 4);
  await p.mouse.up();
}

// Eraser: a zigzag over the top of the page (the student's page is wider, so the same pixels
// are different fractions there).
async function scrubTop(p: Page, page: number) {
  const box = (await inkOn(p, page).boundingBox())!;
  await p.mouse.move(box.x + box.width * 0.15, box.y + 30);
  await p.mouse.down();
  for (let y = 30; y <= 130; y += 6) {
    await p.mouse.move(box.x + box.width * 0.7, box.y + y, { steps: 6 });
    await p.mouse.move(box.x + box.width * 0.15, box.y + y + 3, { steps: 6 });
  }
  await p.mouse.up();
}

test.describe("L2b PDF writing", () => {
  test.describe.configure({ timeout: 150_000 });

  test("pen, text and eraser are shared; the student needs can edit; Save as new PDF", async ({ page, browser }) => {
    const stamp = Date.now();
    const pdfName = `e2e-${stamp}.pdf`;
    await page.setViewportSize({ width: 1440, height: 900 });
    const joinPath = await startTestLesson(page, async (p) => {
      await deleteTestFiles(p);
      await uploadToClassroom(p, pdfName, "application/pdf", testPdf(2));
    });

    try {
      const student = await joinAsStudent(browser, joinPath);
      const files = page.getByRole("complementary", { name: "Test's files" });
      await files.getByRole("button", { name: new RegExp(pdfName) }).click();
      for (const p of [page, student]) await expect(p.getByText("Page 1 of 2")).toBeVisible({ timeout: 30_000 });

      // Scroll is the default; the student's tools are off without "can edit".
      await expect(toolbar(page).getByRole("button", { name: "Scroll" })).toHaveAttribute("aria-pressed", "true");
      await expect(toolbar(student).getByRole("button", { name: "Pen" })).toBeDisabled();

      // Teacher: a pen stroke and a text on page 1; the student sees both.
      await toolbar(page).getByRole("button", { name: "Pen" }).click();
      await strokeOn(page, 1);
      await toolbar(page).getByRole("button", { name: "Text" }).click();
      const box = (await inkOn(page, 1).boundingBox())!;
      await page.mouse.click(box.x + 80, box.y + 160);
      await page.getByRole("textbox", { name: "Text on the PDF" }).fill("one towel");
      await page.keyboard.press("Enter");
      await expect(inkOn(page, 1).locator("path")).toHaveCount(1);
      await expect(inkOn(student, 1).locator("path")).toHaveCount(1, { timeout: 10_000 });
      await expect(inkOn(student, 1).getByText("one towel")).toBeAttached({ timeout: 10_000 });

      // With "can edit" the student highlights too, and the teacher sees it.
      await page.getByRole("button", { name: /views only$/ }).click();
      await expect(toolbar(student).getByRole("button", { name: "Highlighter" })).toBeEnabled({ timeout: 10_000 });
      await toolbar(student).getByRole("button", { name: "Highlighter" }).click();
      await strokeOn(student, 1);
      await expect(inkOn(page, 1).locator("path")).toHaveCount(2, { timeout: 10_000 });

      // Eraser: dragging over the student's highlight removes it for both.
      await toolbar(page).getByRole("button", { name: "Eraser" }).click();
      await scrubTop(page, 1);
      await expect(inkOn(page, 1).locator("path")).toHaveCount(0);
      await expect(inkOn(student, 1).locator("path")).toHaveCount(0, { timeout: 10_000 });
      await expect(inkOn(student, 1).getByText("one towel")).toBeAttached();

      // Save as new PDF: a copy with the writing appears in the files panel.
      await toolbar(page).getByRole("button", { name: "Pen" }).click();
      await strokeOn(page, 1);
      await toolbar(page).getByRole("button", { name: "Save as new PDF" }).click();
      const savedRe = new RegExp(`e2e-${stamp} \\(\\d+ \\w+ \\d{4}\\)\\.pdf`);
      await expect(page.getByRole("status").filter({ hasText: savedRe })).toBeVisible({ timeout: 30_000 });
      await expect(files.getByRole("button", { name: savedRe })).toBeVisible();

      // The copy really has the writing: download it through the lesson's own API.
      const slug = joinPath.split("/").pop()!;
      const savedId = await files
        .getByRole("button", { name: savedRe })
        .evaluate((el) => el.closest("[data-file-id]")?.getAttribute("data-file-id") ?? "");
      expect(savedId).not.toBe("");
      {
        const res = await page.request.post("/api/resource-url", { data: { slug, id: savedId } });
        const { url } = await res.json();
        const bytes = await (await page.request.get(url)).body();
        const copy = await PDFDocument.load(bytes);
        expect(copy.getPageCount()).toBe(2);
        // The original is a few hundred bytes; the writing (and its font) make the copy bigger.
        expect(bytes.length).toBeGreaterThan(testPdf(2).length + 500);
      }

      // Clear: the teacher empties this PDF's writing for both.
      // deleteTestFiles already accepts every confirm on this page.
      await toolbar(page).getByRole("button", { name: /^Clear the writing/ }).click();
      await expect(inkOn(student, 1).locator("path, text")).toHaveCount(0, { timeout: 10_000 });

      await student.context().close();
    } finally {
      const leave = page.getByRole("button", { name: "Leave the lesson" });
      if (await leave.count()) {
        await leave.click();
        await page.waitForURL("**/dashboard");
      } else {
        await page.goto("/dashboard");
      }
      await openTestClassroom(page);
      await deleteTestFiles(page);
    }
  });
});

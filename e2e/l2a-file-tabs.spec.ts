import { expect, type Page, test } from "@playwright/test";
import {
  deleteTestFiles,
  joinAsStudent,
  openTestClassroom,
  startTestLesson,
  TEST_PNG,
  testPdf,
  uploadToClassroom,
} from "./helpers";

// L2a: PDFs and pictures from the files panel open as tabs for both; the PDF's scroll follows
// the teacher. The files are uploaded to the "Test" classroom and deleted again.

const tabs = (page: Page) => page.getByRole("tablist", { name: "Open tabs" }).getByRole("tab");

test.describe("L2a file tabs", () => {
  test.describe.configure({ timeout: 150_000 });

  test("click a PDF, drag a picture; the student sees both and follows the PDF", async ({ page, browser }) => {
    const stamp = Date.now();
    const pdfName = `e2e-${stamp}.pdf`;
    const pngName = `e2e-${stamp}.png`;
    await page.setViewportSize({ width: 1440, height: 900 });
    const joinPath = await startTestLesson(page, async (p) => {
      await deleteTestFiles(p);
      await uploadToClassroom(p, pdfName, "application/pdf", testPdf(3));
      await uploadToClassroom(p, pngName, "image/png", TEST_PNG);
    });
    const slug = joinPath.split("/").pop()!;

    try {
      const student = await joinAsStudent(browser, joinPath);
      const files = page.getByRole("complementary", { name: "Test's files" });
      await expect(files.getByText("Click a PDF or picture to open it, press play for audio")).toBeVisible();

      // Click: the PDF opens beside Text, for both.
      await files.getByRole("button", { name: new RegExp(pdfName) }).click();
      for (const p of [page, student]) {
        await expect(tabs(p)).toHaveText(["Text", pdfName], { timeout: 20_000 });
        await expect(p.getByText("Page 1 of 3")).toBeVisible({ timeout: 30_000 });
      }
      await expect(files.getByRole("button", { name: new RegExp(pdfName) })).toContainText("On screen");
      await expect(student.getByText(/chooses the page$/)).toBeVisible();

      // Scroll: the student follows to page 2.
      await page.getByTestId("pdf-scroller").evaluate((el) => {
        const second = el.querySelector('[data-page="2"]') as HTMLElement;
        el.scrollTop = second.offsetTop + 40;
      });
      await expect(page.getByText("Page 2 of 3")).toBeVisible();
      await expect(student.getByText("Page 2 of 3")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/sees page 2$/)).toBeVisible();

      // Two tabs: a click only shows the hint …
      await files.getByRole("button", { name: `Open ${pngName}` }).click();
      await expect(files.getByText("Two tabs are open. Close one first")).toBeVisible();
      await expect(tabs(page)).toHaveText(["Text", pdfName]);

      // … dragging onto "Replace Text" swaps it.
      await files.getByRole("button", { name: `Open ${pngName}` }).hover();
      await page.mouse.down();
      await page.mouse.move(700, 400, { steps: 5 });
      await expect(page.getByTestId("drop-zones")).toBeVisible();
      await expect(page.getByTestId("drop-0")).toContainText("Replace Text");
      // Plain mouse moves: Playwright's hover() waits forever in the middle of an HTML5 drag.
      await page.waitForTimeout(300);
      const zone = (await page.getByTestId("drop-0").boundingBox())!;
      await page.mouse.move(zone.x + zone.width / 2, zone.y + zone.height / 2, { steps: 5 });
      await expect(page.getByTestId("drop-0")).toContainText("Drop to open");
      await page.mouse.up();
      for (const p of [page, student]) {
        await expect(tabs(p)).toHaveText([pngName, pdfName], { timeout: 20_000 });
        await expect(p.getByRole("img", { name: pngName })).toBeVisible({ timeout: 20_000 });
      }

      // The API only hands out files of the lesson behind the slug.
      const bad = await page.request.post("/api/resource-url", {
        data: { slug, id: "00000000-0000-4000-8000-000000000000" },
      });
      expect(bad.status()).toBe(404);
      const noSlug = await page.request.post("/api/resource-url", { data: { slug: "x", id: "y" } });
      expect(noSlug.status()).toBe(400);

      await student.context().close();
    } finally {
      await page.mouse.up().catch(() => {}); // in case a drag was left half-done
      // Leave properly first: the room sends the teacher to the dashboard when it disconnects.
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

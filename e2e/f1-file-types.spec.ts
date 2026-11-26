import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { deleteTestFiles, joinAsStudent, openTestClassroom, startTestLesson, uploadToClassroom } from "./helpers";

// F1: videos (MP4, MOV, WebM) and text files in the Classroom. One list with filters; in the
// lesson a video plays in sync for both and a text file shows as text. Other formats are refused.

test("F1: videos and text files in the Classroom and the lesson", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const stamp = Date.now();
  const video = `e2e-clip-${stamp}.webm`;
  const text = `e2e-notes-${stamp}.txt`;
  const mov = `e2e-phone-${stamp}.mov`;
  await page.setViewportSize({ width: 1440, height: 900 });
  const joinPath = await startTestLesson(page, async (p) => {
    await deleteTestFiles(p);
    await uploadToClassroom(p, video, "video/webm", readFileSync(path.join(__dirname, "fixtures/e2e-clip.webm")));
    await uploadToClassroom(p, text, "text/plain", Buffer.from("Homework\nRead page 12 and write five sentences.\n"));
    // A MOV (from a phone) is a video too. (This test browser can't play MOV/MP4: upload only.)
    await uploadToClassroom(p, mov, "video/quicktime", readFileSync(path.join(__dirname, "fixtures/e2e-clip.webm")));
    // Other formats are refused with a message; an old Word file gets advice.
    const input = p.locator('input[type="file"]');
    await input.setInputFiles({ name: "e2e-slides.pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", buffer: Buffer.from("x") });
    await expect(p.getByText("e2e-slides.pptx: this kind of file can't be uploaded.")).toBeVisible();
    await input.setInputFiles({ name: "e2e-old.doc", mimeType: "application/msword", buffer: Buffer.from("x") });
    await expect(p.getByText("is an old Word file")).toBeVisible();
    const row = (name: string) => p.getByRole("listitem").filter({ hasText: name });
    await expect(row(video)).toContainText("Video ·");
    await expect(row(text)).toContainText("TXT ·");
    await expect(row(mov)).toContainText("Video ·");
    // Filters for the groups there are; Videos shows only the video.
    const filters = p.getByRole("group", { name: "Show" });
    await filters.getByRole("button", { name: /^Videos/ }).click();
    await expect(row(text)).toHaveCount(0);
    await expect(row(video)).toBeVisible();
    await filters.getByRole("button", { name: /^Documents/ }).click();
    await expect(row(text)).toBeVisible();
    await expect(row(video)).toHaveCount(0);
    await filters.getByRole("button", { name: /^All/ }).click();
  });

  const student = await joinAsStudent(browser, joinPath);
  try {
    const files = page.getByRole("complementary", { name: "Test's files" });
    await expect(files.getByRole("region", { name: "Videos" })).toBeVisible();
    await expect(files.getByRole("region", { name: "Documents" })).toBeVisible();

    // Text file: shown as text for both.
    await files.getByRole("button", { name: new RegExp(text.replace(/\./g, "\\.")) }).click();
    for (const p of [page, student]) await expect(p.getByTestId("text-file")).toContainText("Read page 12", { timeout: 20_000 });

    // Video: the teacher plays it, the student's copy plays along; pause too.
    await page.getByRole("button", { name: `Close ${text}` }).click();
    await files.getByRole("button", { name: new RegExp(video.replace(/\./g, "\\.")) }).click();
    const mine = page.getByTestId("uploaded-video");
    const theirs = student.getByTestId("uploaded-video");
    await expect(theirs).toBeVisible({ timeout: 20_000 });
    await mine.evaluate((v: HTMLVideoElement) => v.play());
    await expect(theirs).toHaveAttribute("data-following", "playing", { timeout: 10_000 });
    await expect.poll(() => theirs.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 10_000 }).toBeGreaterThan(1);
    await mine.evaluate((v: HTMLVideoElement) => {
      v.pause();
      v.currentTime = 8;
    });
    await expect(theirs).toHaveAttribute("data-following", "paused", { timeout: 10_000 });
    await expect.poll(() => theirs.evaluate((v: HTMLVideoElement) => Math.round(v.currentTime)), { timeout: 10_000 }).toBe(8);
  } finally {
    await student.context().close();
    await page.getByRole("button", { name: "Leave the lesson" }).click();
    await page.goto("/dashboard");
    await openTestClassroom(page);
    await deleteTestFiles(page);
  }
});

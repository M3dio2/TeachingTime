import { expect, test } from "@playwright/test";
import { deleteTestFiles, joinAsStudent, openTestClassroom, startTestLesson } from "./helpers";

// G2: links in the classroom. A YouTube link is named after the video and plays in the call
// for both, the student following the teacher's play and pause; any other link is a card both
// can open. Needs the internet (YouTube).
const VIDEO = "https://www.youtube.com/watch?v=M7lc1UVf-VE"; // YouTube's own IFrame API demo video

test("G2: a YouTube link plays for both; another link is a card", async ({ page, browser }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const joinPath = await startTestLesson(page, async (p) => {
    await deleteTestFiles(p);
    const field = p.getByRole("textbox", { name: "Link to add" });
    await field.fill("not a link");
    await p.getByRole("button", { name: "Add link" }).click();
    await expect(p.getByText("doesn't look like a web address")).toBeVisible();
    await field.fill(VIDEO);
    await p.getByRole("button", { name: "Add link" }).click();
    await expect(p.getByRole("listitem").filter({ hasText: "YouTube Developers Live" })).toBeVisible({ timeout: 20_000 });
    await field.fill("example.com/e2e-page");
    await p.getByRole("button", { name: "Add link" }).click();
    await expect(p.getByRole("listitem").filter({ hasText: "example.com/e2e-page" })).toBeVisible({ timeout: 20_000 });
  });

  try {
    const student = await joinAsStudent(browser, joinPath);
    const files = page.getByRole("complementary", { name: "Test's files" });
    await files.getByRole("button", { name: /YouTube Developers Live/ }).click();
    for (const p of [page, student]) {
      await expect(p.getByTestId("video-player").locator("iframe")).toBeVisible({ timeout: 30_000 });
      await expect(p.getByText("Opening the video…")).toHaveCount(0, { timeout: 30_000 });
    }
    await expect(student.getByTestId("video-player")).toHaveAttribute("data-following", "paused", { timeout: 15_000 });

    // The teacher presses play; the student follows. YouTube refuses to play from some
    // servers (bot check, error 150): then both show "Watch on YouTube" and the step is skipped.
    const frame = (await page.getByTestId("video-player").locator("iframe").boundingBox())!;
    await page.mouse.click(frame.x + frame.width / 2, frame.y + frame.height / 2);
    const blocked = page.getByRole("link", { name: "Watch on YouTube" });
    const outcome = await Promise.race([
      expect(student.getByTestId("video-player")).toHaveAttribute("data-following", "playing", { timeout: 20_000 }).then(() => "played"),
      blocked.waitFor({ timeout: 20_000 }).then(() => "blocked"),
    ]);
    if (outcome === "blocked") {
      await expect(blocked).toHaveAttribute("href", VIDEO);
      test.info().annotations.push({ type: "note", description: "YouTube refused playback here; sync not checked" });
    }

    // Another link: a card with "Open the link" for both.
    await page.getByRole("button", { name: /^Close YouTube Developers Live/ }).click();
    await files.getByRole("button", { name: /example\.com\/e2e-page/ }).click();
    for (const p of [page, student]) {
      await expect(p.getByRole("link", { name: "Open the link" })).toHaveAttribute("href", "https://example.com/e2e-page", { timeout: 20_000 });
    }
    await student.context().close();
  } finally {
    const leave = page.getByRole("button", { name: "Leave the lesson" });
    if (await leave.count()) {
      await leave.click();
      await page.waitForURL("**/dashboard");
    }
    await openTestClassroom(page);
    // Links have no "e2e-" file name: remove them by their names.
    page.on("dialog", (d) => d.accept().catch(() => {}));
    for (const name of ["YouTube Developers Live", "example.com/e2e-page"]) {
      const item = page.getByRole("listitem").filter({ hasText: name });
      while (await item.count()) {
        await item.first().getByRole("button", { name: /^Delete/ }).click();
        await page.waitForTimeout(1500);
      }
    }
  }
});

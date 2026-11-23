import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";
import { joinAsStudent, startTestLesson } from "./helpers";

// R1: the teacher records in her browser, only after the student agreed. Stopping (by either
// of them) downloads the file; the student can say no. Checked with ffprobe when it's there.
function streams(path: string): string[] {
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", path]);
    return out.toString().trim().split("\n").filter(Boolean).sort();
  } catch {
    return ["(no ffprobe)"];
  }
}

const recordDialog = (p: Page) => p.getByRole("dialog", { name: "Record this lesson" });
const consent = (p: Page) => p.getByRole("dialog", { name: "Record this lesson?" });

test("R1: record with consent, the student says no, the student stops it", async ({ page, browser }, info) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const joinPath = await startTestLesson(page);
  const student = await joinAsStudent(browser, joinPath);
  try {
    // 1. Everything (voices, cameras, lesson screen); the student allows; the teacher stops.
    await page.getByRole("button", { name: "Record", exact: true }).click();
    const dialog = recordDialog(page);
    await expect(dialog.getByLabel("Voices")).toBeChecked();
    await expect(dialog.getByLabel("Cameras")).toBeChecked();
    await expect(dialog.getByLabel("Lesson screen")).toBeChecked();
    await dialog.getByRole("button", { name: "Ask E2E Student and record" }).click();
    await expect(page.getByRole("dialog", { name: "Asking…" })).toBeVisible();
    await expect(consent(student)).toContainText("Recorded: Voices, Cameras, Lesson screen");
    await consent(student).getByRole("button", { name: "Allow", exact: true }).click();
    for (const p of [page, student]) await expect(p.getByTestId("rec-pill")).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(6000);
    const first = page.waitForEvent("download");
    await page.getByTestId("rec-pill").getByRole("button", { name: "Stop" }).click();
    const file = await first;
    expect(file.suggestedFilename()).toMatch(/^TeachingTime – E2E Student – \d{4}-\d\d-\d\d \d\d\.\d\d\.(mp4|webm)$/);
    const path1 = info.outputPath("all." + file.suggestedFilename().split(".").pop());
    await file.saveAs(path1);
    const s1 = streams(path1);
    if (s1[0] !== "(no ffprobe)") expect(s1).toEqual(["audio", "video"]);
    for (const p of [page, student]) await expect(p.getByTestId("rec-pill")).toBeHidden();
    await expect(page.getByText(/^Recording saved: TeachingTime/)).toBeVisible();
    await page.getByRole("button", { name: "Close" }).last().click();

    // 2. Voices only; the student says no: nothing is recorded.
    await page.getByRole("button", { name: "Record", exact: true }).click();
    await recordDialog(page).getByLabel("Cameras").uncheck();
    await recordDialog(page).getByLabel("Lesson screen").uncheck();
    await recordDialog(page).getByRole("button", { name: "Ask E2E Student and record" }).click();
    await expect(consent(student)).toContainText("Recorded: Voices");
    await consent(student).getByRole("button", { name: "Don't allow" }).click();
    await expect(page.getByText("E2E Student doesn't want the lesson recorded. Nothing was recorded.")).toBeVisible();
    await expect(page.getByTestId("rec-pill")).toBeHidden();

    // 3. Voices and cameras (no tab capture); the student stops it from her side.
    await page.getByRole("button", { name: "Record", exact: true }).click();
    await recordDialog(page).getByLabel("Lesson screen").uncheck();
    await recordDialog(page).getByRole("button", { name: "Ask E2E Student and record" }).click();
    await consent(student).getByRole("button", { name: "Allow", exact: true }).click();
    await expect(student.getByTestId("rec-pill")).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(4000);
    const second = page.waitForEvent("download");
    await student.getByTestId("rec-pill").getByRole("button", { name: "Stop" }).click();
    const file2 = await second;
    const path2 = info.outputPath("cams." + file2.suggestedFilename().split(".").pop());
    await file2.saveAs(path2);
    const s2 = streams(path2);
    if (s2[0] !== "(no ffprobe)") expect(s2).toEqual(["audio", "video"]);
    await expect(page.getByText(/^E2E Student stopped the recording\. Recording saved: TeachingTime/)).toBeVisible();
  } finally {
    await student.context().close();
  }
});

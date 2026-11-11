import { expect, type Page, test } from "@playwright/test";
import { audioPosition, cleanAudio, formatTime } from "../lib/room/audio";
import { deleteTestFiles, joinAsStudent, openTestClassroom, startTestLesson, testWav, uploadToClassroom } from "./helpers";

// A1: the teacher plays a classroom audio file; both see the bar, the student gets it as its own
// LiveKit track (not the microphone). The file is uploaded to "Test" and deleted again.

const slider = (page: Page) => page.getByTestId("audio-bar").getByRole("slider", { name: "Audio position" });
const position = async (page: Page) => Number(await slider(page).getAttribute("aria-valuenow"));
// LiveKit's RoomAudioRenderer plays every remote audio track in its own <audio> element.
const audioElements = (page: Page) => page.locator("audio").count();

test("A1: the teacher plays audio, the student hears and sees it", async ({ page, browser }) => {
  test.setTimeout(150_000);
  const name = `e2e-${Date.now()}.wav`;
  await page.setViewportSize({ width: 1440, height: 900 });
  const joinPath = await startTestLesson(page, async (p) => {
    await deleteTestFiles(p);
    await uploadToClassroom(p, name, "audio/wav", testWav(6));
  });

  try {
    const student = await joinAsStudent(browser, joinPath);
    await expect.poll(() => audioElements(student), { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
    const before = await audioElements(student);

    await page.getByRole("button", { name: `Play ${name}` }).click();
    for (const p of [page, student]) {
      await expect(p.getByTestId("audio-bar")).toContainText(name, { timeout: 20_000 });
      await expect(p.getByTestId("audio-bar")).toContainText("0:06");
    }
    await expect(page.getByRole("button", { name: `Pause ${name}` })).toBeVisible();
    await expect(page.getByText("Playing", { exact: true })).toBeVisible();
    // A separate track reaches the student (the microphone was already there).
    await expect.poll(() => audioElements(student), { timeout: 20_000 }).toBeGreaterThan(before);
    // The student's bar runs on its own.
    await expect.poll(() => position(student), { timeout: 10_000 }).toBeGreaterThanOrEqual(2);

    // Pause: the student's bar stops too.
    await page.getByRole("button", { name: "Pause the audio" }).click();
    const paused = await position(student);
    await page.waitForTimeout(1500);
    expect(await position(student)).toBe(paused);

    // Stop: the bar goes for both.
    await page.getByRole("button", { name: "Stop the audio" }).click();
    for (const p of [page, student]) await expect(p.getByTestId("audio-bar")).toHaveCount(0);

    // Tester feedback: audio can be dragged onto the stage too; one area, "Play …".
    // Plain mouse moves: Playwright's hover() waits forever in the middle of an HTML5 drag.
    const row = page.locator(`[data-file-id]`).filter({ hasText: name });
    const rowBox = (await row.boundingBox())!;
    await page.mouse.move(rowBox.x + rowBox.width - 30, rowBox.y + rowBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(700, 400, { steps: 5 });
    await expect(page.getByTestId("drop-zones")).toBeVisible();
    await expect(page.getByTestId("drop-1")).toHaveCount(0);
    await page.waitForTimeout(300);
    const zone = (await page.getByTestId("drop-0").boundingBox())!;
    await page.mouse.move(zone.x + zone.width / 2, zone.y + zone.height / 2, { steps: 5 });
    await expect(page.getByTestId("drop-0")).toContainText("Drop to play");
    await page.mouse.up();
    for (const p of [page, student]) await expect(p.getByTestId("audio-bar")).toContainText(name, { timeout: 20_000 });
    await expect(page.getByRole("tab")).toHaveText(["Text"]); // the tabs stay
    await page.getByRole("button", { name: "Stop the audio" }).click();
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

test("A1: the student checks the audio attribute", () => {
  const ok = { id: "11111111-1111-4111-8111-111111111111", name: "a.mp3", duration: 130, startedAt: 1000, pausedAt: null };
  expect(cleanAudio(JSON.stringify(ok))).toEqual(ok);
  expect(cleanAudio("")).toBeNull();
  expect(cleanAudio("{bad")).toBeNull();
  expect(cleanAudio(JSON.stringify({ ...ok, id: "../x" }))).toBeNull();
  expect(cleanAudio(JSON.stringify({ ...ok, duration: "1" }))).toBeNull();
  expect(audioPosition(ok, 43_000)).toBe(42);
  expect(audioPosition({ ...ok, pausedAt: 10 }, 99_000)).toBe(10);
  expect(audioPosition(ok, 999_000)).toBe(130); // never past the end
  expect(formatTime(130)).toBe("2:10");
});

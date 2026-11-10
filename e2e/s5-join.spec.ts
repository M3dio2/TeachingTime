import { expect, test } from "@playwright/test";
import { startTestLesson } from "./helpers";

// S5: the join card's camera check. The choices made there carry over into the lesson
// (the same tracks are published), and Rejoin works after leaving.

test("S5 join: camera check, choices carry over, rejoin", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const joinPath = await startTestLesson(page);

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const student = await context.newPage();
  await student.goto(joinPath);
  await expect(student.getByRole("heading", { name: "Join your lesson" })).toBeVisible();

  // The preview plays the (fake) camera.
  const preview = student.getByTestId("camera-preview");
  await expect(preview.getByText("Your camera")).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(() => preview.locator("video").evaluate((v: HTMLVideoElement) => v.videoWidth), { timeout: 15_000 })
    .toBeGreaterThan(0);

  // Mic off before joining.
  await student.getByRole("button", { name: "Turn off your microphone" }).click();
  await expect(student.getByRole("button", { name: "Turn on your microphone" })).toHaveAttribute("aria-pressed", "true");

  await student.getByLabel("Your name").fill("E2E Student");
  await student.getByRole("button", { name: "Join lesson" }).click();
  await expect(student.getByText(/^Following /).first()).toBeVisible({ timeout: 30_000 });

  // In the lesson the microphone is still off, the camera on.
  const micToggle = student.locator('button[data-lk-source="microphone"]');
  await expect(micToggle).toHaveAttribute("data-lk-enabled", "false", { timeout: 15_000 });
  await expect(student.locator('button[data-lk-source="camera"]')).toHaveAttribute("data-lk-enabled", "true");

  // Leave, then Rejoin with the same name.
  await student.getByRole("button", { name: "Leave the lesson" }).click();
  await expect(student.getByRole("heading", { name: "You left the lesson" })).toBeVisible({ timeout: 15_000 });
  await student.getByRole("button", { name: "Rejoin" }).click();
  await expect(student.getByText(/^Following /).first()).toBeVisible({ timeout: 30_000 });

  await context.close();
});

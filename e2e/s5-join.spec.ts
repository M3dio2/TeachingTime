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

// Tester feedback (Nothing Phone): the microphone was never asked for, only the camera.
// Here the browser refuses the microphone until the student taps its button: the camera still
// starts, the message names the microphone, and the tap asks again and gets it.
test("S5 join: a microphone that fails can be asked for again with a tap", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const joinPath = await startTestLesson(page);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    // On the prototype: the browser shim in livekit-client keeps its own reference.
    const proto = MediaDevices.prototype;
    const original = proto.getUserMedia;
    const w = window as unknown as { __allowMic: boolean };
    w.__allowMic = false;
    proto.getUserMedia = async function (this: MediaDevices, c?: MediaStreamConstraints) {
      if (c?.audio && !w.__allowMic) throw new DOMException("Permission denied", "NotAllowedError");
      return original.call(this, c);
    };
  });
  const student = await context.newPage();
  await student.goto(joinPath);
  const preview = student.getByTestId("camera-preview");
  const message = student.locator("p[role=alert]"); // Next has an empty role=alert of its own
  await expect(message).toContainText("microphone", { timeout: 15_000 });
  await expect(message).toContainText("NotAllowedError");
  await expect
    .poll(() => preview.locator("video").evaluate((v: HTMLVideoElement) => v.videoWidth), { timeout: 15_000 })
    .toBeGreaterThan(0);

  const mic = student.getByRole("button", { name: "Turn on your microphone" });
  await expect(mic).toHaveAttribute("aria-pressed", "true");
  await student.evaluate(() => ((window as unknown as { __allowMic: boolean }).__allowMic = true));
  await mic.click();
  await expect(student.getByRole("button", { name: "Turn off your microphone" })).toBeVisible({ timeout: 10_000 });
  await expect(message).toHaveCount(0);

  await student.getByLabel("Your name").fill("E2E Student");
  await student.getByRole("button", { name: "Join lesson" }).click();
  await expect(student.locator('button[data-lk-source="microphone"]')).toHaveAttribute("data-lk-enabled", "true", {
    timeout: 30_000,
  });
  await context.close();
});

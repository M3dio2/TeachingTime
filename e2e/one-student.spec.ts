import { expect, test } from "@playwright/test";
import { joinAsStudent, startTestLesson } from "./helpers";

// Tester feedback: a student could join twice (phone and laptop). One student per lesson: the
// newest device takes over, the older one is told and can take the lesson back.

test("one student per lesson: a second device takes over, the first can continue", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const joinPath = await startTestLesson(page);
  const first = await joinAsStudent(browser, joinPath);
  const second = await joinAsStudent(browser, joinPath);

  await expect(first.getByRole("heading", { name: "You joined this lesson somewhere else." })).toBeVisible({
    timeout: 20_000,
  });
  // The teacher sees one student, not two.
  await expect(page.getByTestId("camera-column").locator(".lk-participant-tile")).toHaveCount(2);

  // "Continue here" moves the lesson back to the first device.
  await first.getByRole("button", { name: "Continue here" }).click();
  await expect(first.getByText(/^Following /).first()).toBeVisible({ timeout: 30_000 });
  await expect(second.getByRole("heading", { name: "You joined this lesson somewhere else." })).toBeVisible({
    timeout: 20_000,
  });

  await first.context().close();
  await second.context().close();
  await page.getByRole("button", { name: "Leave the lesson" }).click();
});

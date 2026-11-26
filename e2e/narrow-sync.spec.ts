import { expect, test } from "@playwright/test";
import { joinAsStudent, startTestLesson } from "./helpers";

// Tester feedback: with a window too narrow for two tabs side by side, the two people saw
// different things. Teacher narrow: the student gets "one at a time" and the same tab.
// (A student's desktop window is never that narrow: below it the phone layout takes over,
// where she can tap between the two tabs.)
const stage = (p: import("@playwright/test").Page) => p.getByTestId("stage");
const visibleTabs = (p: import("@playwright/test").Page) =>
  stage(p).locator("[data-tab]:not([hidden])").evaluateAll((els) => els.map((e) => e.getAttribute("data-tab")));

test("narrow windows: teacher and student see the same tab", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const joinPath = await startTestLesson(page);
  const student = await joinAsStudent(browser, joinPath);

  await page.getByRole("button", { name: "Open a tab" }).click();
  await page.getByRole("menuitem", { name: /^Draw/ }).click();
  for (const p of [page, student]) await expect(stage(p)).toHaveAttribute("data-layout", "split", { timeout: 20_000 });

  // Teacher narrow (camera column and files panel open on a laptop-sized window): one at a
  // time for both, the same tab.
  await page.setViewportSize({ width: 1100, height: 800 });
  // The files fold by themselves at this width (unless opened by hand before): open them.
  const unfold = page.getByRole("button", { name: "Show Test's files" });
  const open = page.getByRole("complementary", { name: "Test's files", exact: true });
  await expect(unfold.or(open)).toBeVisible();
  if (await unfold.count()) await unfold.click();
  await expect(open).toBeVisible();
  await expect(stage(page)).toHaveAttribute("data-layout", "single");
  await expect(stage(student)).toHaveAttribute("data-layout", "single", { timeout: 15_000 });
  await page.getByRole("tab", { name: "Text" }).click();
  await expect.poll(() => visibleTabs(student), { timeout: 15_000 }).toEqual(["text"]);
  await page.getByRole("tab", { name: "Draw" }).click();
  await expect.poll(() => visibleTabs(student), { timeout: 15_000 }).toEqual(["draw"]);

  // Wide again: side by side for both.
  await page.getByRole("button", { name: "Fold the files" }).click();
  await expect(stage(student)).toHaveAttribute("data-layout", "split", { timeout: 15_000 });

  await student.context().close();
  await page.getByRole("button", { name: "Leave the lesson" }).click();
});

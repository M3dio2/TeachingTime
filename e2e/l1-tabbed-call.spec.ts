import { expect, type Page, test } from "@playwright/test";
import { joinAsStudent, startTestLesson } from "./helpers";

// L1: the teacher opens and closes tabs, the student follows, there are never more than two.
// Teacher = the test account in its lesson "Test" (AGENTS.md); student = a second context.

const tabs = (page: Page) => page.getByRole("tablist", { name: "Open tabs" }).getByRole("tab");
const tab = (page: Page, name: string) => page.getByRole("tab", { name, exact: true });
const stage = (page: Page) => page.getByTestId("stage");

test.describe("L1 tabbed call", () => {
  test.describe.configure({ timeout: 120_000 });

  test("desktop: the student follows tabs, active tab, layout and Just talk", async ({ page, browser }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const joinPath = await startTestLesson(page);
    const student = await joinAsStudent(browser, joinPath);

    // Both start with Text.
    for (const p of [page, student]) {
      await expect(tabs(p)).toHaveCount(1);
      await expect(tab(p, "Text")).toHaveAttribute("aria-selected", "true");
    }
    // The student has no teacher controls and no Share button.
    await expect(student.getByRole("button", { name: "Open a tab" })).toHaveCount(0);
    await expect(student.getByRole("button", { name: "Just talk" })).toHaveCount(0);
    await expect(student.getByRole("button", { name: /share/i })).toHaveCount(0);
    await expect(tab(student, "Text")).toBeDisabled();

    // Teacher opens Draw beside Text: both see two tabs, Draw active, side by side.
    await page.getByRole("button", { name: "Open a tab" }).click();
    await page.getByRole("menuitem", { name: /Draw/ }).click();
    for (const p of [page, student]) {
      await expect(tabs(p)).toHaveText(["Text", "Draw"]);
      await expect(tab(p, "Draw")).toHaveAttribute("aria-selected", "true");
      await expect(stage(p)).toHaveAttribute("data-layout", "split");
    }

    // Two is the most: + is gone; each tab has a ×.
    await expect(page.getByRole("button", { name: "Open a tab" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Close Text" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Close Draw" })).toBeVisible();

    // Teacher picks Text: the student follows.
    await tab(page, "Text").click();
    await expect(tab(student, "Text")).toHaveAttribute("aria-selected", "true");

    // One at a time: the student's stage follows.
    await page.getByRole("button", { name: "One at a time" }).click();
    await expect(stage(student)).toHaveAttribute("data-layout", "single");
    await page.getByRole("button", { name: "Side by side" }).click();
    await expect(stage(student)).toHaveAttribute("data-layout", "split");

    // "Student can edit" travels in the same attributes.
    await expect(student.getByText("View only").first()).toBeVisible();
    await page.getByRole("button", { name: /views only$/ }).click();
    await expect(student.getByText("You can write here").first()).toBeVisible();
    await page.getByRole("button", { name: /can edit$/ }).click();
    await expect(student.getByText("View only").first()).toBeVisible();

    // Closing a tab: the student follows; the last tab has no ×.
    await page.getByRole("button", { name: "Close Draw" }).click();
    for (const p of [page, student]) await expect(tabs(p)).toHaveText(["Text"]);
    await expect(page.getByRole("button", { name: "Close Text" })).toHaveCount(0);

    // Just talk folds the tabs away for both; "Show the tab" brings the same tab back.
    await page.getByRole("button", { name: "Just talk" }).click();
    await expect(student.getByText(/folded the tabs\. Just talking for now\./)).toBeVisible();
    await expect(tabs(student)).toHaveCount(0);
    await page.getByRole("button", { name: "Show the tab" }).click();
    await expect(tabs(student)).toHaveText(["Text"]);

    // Clear sits in the Text toolbar (teacher only).
    await expect(page.getByRole("button", { name: "Clear the text for both of you" })).toBeVisible();
    await expect(student.getByRole("button", { name: /^Clear the/ })).toHaveCount(0);

    await student.context().close();
  });

  test("desktop: screen sharing opens and closes the Screen tab", async ({ page, browser }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const joinPath = await startTestLesson(page);
    const student = await joinAsStudent(browser, joinPath);

    await page.getByRole("button", { name: "Open a tab" }).click();
    await page.getByRole("menuitem", { name: /Draw/ }).click();
    await expect(tab(student, "Draw")).toHaveAttribute("aria-selected", "true");

    // Chromium's fake capture (--auto-select-desktop-capture-source in playwright.config.ts).
    await page.getByRole("button", { name: "Share your screen" }).click();
    // With two tabs, Screen takes the active tab's place (Draw) …
    for (const p of [page, student]) {
      await expect(tabs(p)).toHaveText(["Text", "Screen"], { timeout: 20_000 });
      await expect(tab(p, "Screen")).toHaveAttribute("aria-selected", "true");
    }
    await expect(student.getByText(/'s screen$/)).toBeVisible();

    // … and gives it back when sharing stops.
    await stage(page).getByRole("button", { name: "Stop sharing" }).click();
    for (const p of [page, student]) await expect(tabs(p)).toHaveText(["Text", "Draw"]);

    await student.context().close();
  });

  test("desktop: sizes, breakpoints and one at a time by itself", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await startTestLesson(page);
    const column = page.getByTestId("camera-column");

    // 1280+: camera column 240 px, files open. Arrow keys resize, and it's remembered.
    await expect(column).toBeVisible();
    expect((await column.boundingBox())?.width).toBe(240);
    await page.getByRole("button", { name: "Resize the camera column" }).focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect.poll(async () => (await column.boundingBox())?.width).toBe(272);
    await expect(page.getByRole("complementary", { name: "Test's files" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("region", { name: "Lesson" })).toBeVisible({ timeout: 30_000 });
    await expect.poll(async () => (await column.boundingBox())?.width).toBe(272);

    // 1024–1279: files folded to the icon strip.
    await page.setViewportSize({ width: 1100, height: 800 });
    await expect(page.getByRole("complementary", { name: "Test's files, folded" })).toBeVisible();
    await expect(column).toBeVisible();

    // Two tabs, then unfold the files: the stage gets too narrow for two, so it shows one at
    // a time by itself and "Side by side" is disabled.
    await page.getByRole("button", { name: "Open a tab" }).click();
    await page.getByRole("menuitem", { name: /Draw/ }).click();
    await expect(stage(page)).toHaveAttribute("data-layout", "split");
    await page.getByRole("button", { name: "Show Test's files" }).click();
    await expect(stage(page)).toHaveAttribute("data-layout", "single");
    await expect(page.getByRole("button", { name: "Side by side" })).toBeDisabled();
    await page.getByRole("button", { name: "Fold the files" }).click();
    await expect(stage(page)).toHaveAttribute("data-layout", "split");

    // 768–1023: no column; the cameras sit in a row above the stage (tester feedback: no
    // floating cameras), nothing on top of the tabs.
    await page.setViewportSize({ width: 900, height: 800 });
    await expect(column).toHaveCount(0);
    const cameraRow = page.getByTestId("camera-row");
    await expect(cameraRow).toBeVisible();
    const rowBox = (await cameraRow.boundingBox())!;
    const area = (await stage(page).boundingBox())!;
    expect(rowBox.y + rowBox.height).toBeLessThan(area.y);
    expect(rowBox.height).toBeLessThanOrEqual(130);

    // The action bar shows icons only here.
    await expect(page.getByRole("button", { name: "Leave the lesson" })).not.toContainText("Leave");
    await expect(page.getByRole("button", { name: /views only$/ })).toBeVisible();

    // Just talk on a tablet-sized window: one camera big, your own small (alone here: just yours).
    await page.getByRole("button", { name: "Just talk" }).click();
    await expect(page.getByTestId("spotlight")).toBeVisible();
    await page.getByRole("button", { name: /^Show the/ }).click();
  });

  test("phone: the teacher opens a second tab; the student taps and jumps back", async ({ browser }) => {
    const phone = { width: 390, height: 844 };
    const teacherContext = await browser.newContext({ viewport: phone });
    const page = await teacherContext.newPage();
    const joinPath = await startTestLesson(page);
    const student = await joinAsStudent(browser, joinPath, phone);

    const teacherTab = (name: string) =>
      page.getByRole("group", { name: "Open tabs" }).getByRole("button", { name, exact: true });
    const studentTab = (name: string) =>
      student.getByRole("group", { name: "Lesson tabs" }).getByRole("button", { name, exact: true });

    await expect(student.getByText(/shows Text$/)).toBeVisible();
    await page.getByRole("button", { name: "Open a second tab" }).click();
    await expect(teacherTab("Draw")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Open a second tab" })).toHaveCount(0);

    await expect(student.getByText(/shows two tabs$/)).toBeVisible();
    await expect(studentTab("Draw")).toHaveAttribute("aria-pressed", "true");

    // The student may look at the other tab …
    await studentTab("Text").click();
    await expect(studentTab("Text")).toHaveAttribute("aria-pressed", "true");
    await expect(teacherTab("Draw")).toHaveAttribute("aria-pressed", "true");

    // … and jumps along when the teacher switches.
    await teacherTab("Text").click();
    await teacherTab("Draw").click();
    await expect(studentTab("Draw")).toHaveAttribute("aria-pressed", "true");

    // ⋯ sheet: the edit switch reaches the student (her board on Draw stops being view only).
    await expect(student.getByText("View only")).toBeVisible();
    await page.getByRole("button", { name: "More controls" }).click();
    await page.getByRole("switch", { name: /can write and draw/ }).click();
    await expect(student.getByText("View only")).toHaveCount(0);

    await student.context().close();
    await teacherContext.close();
  });
});

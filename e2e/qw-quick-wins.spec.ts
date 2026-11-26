import { expect, test } from "@playwright/test";
import { logIn, openTestClassroom, TEST_CLASSROOM } from "./helpers";

// Review quick wins (docs/REVIEW-2026-11.md): our own confirm dialog (B14), one account menu
// (B2), the device check in Settings (A3), a waiting student in the tab title (A2), the empty
// text pad's hint (B6) and the "can write" switch (B5).

test("QW: confirm dialog, account menu, device check", async ({ page }) => {
  test.setTimeout(120_000);
  await logIn(page);

  // B2: Settings and Log out live in the account menu.
  await page.getByRole("button", { name: /^Account: / }).click();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings$/);

  // A3: camera preview and a microphone meter, only after asking.
  await expect(page.getByRole("meter", { name: "Microphone level" })).toHaveCount(0);
  await page.getByRole("button", { name: "Check camera and microphone" }).click();
  await expect(page.getByRole("meter", { name: "Microphone level" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Stop the check" }).click();
  await expect(page.getByRole("meter", { name: "Microphone level" })).toHaveCount(0);

  // B14: removing a Classroom asks in our own dialog; Cancel keeps it, Remove removes it.
  await page.goto("/dashboard");
  const name = `e2e-Confirm ${Date.now() % 100000}`;
  await page.getByLabel("Student's name").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const card = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: `Open ${name}'s Classroom` }) });
  await expect(card).toBeVisible();
  let dialogs = 0;
  page.on("dialog", (d) => {
    dialogs++;
    void d.dismiss();
  });
  const remove = async () => {
    const item = page.getByRole("menuitem", { name: `Remove ${name}` });
    // After Cancel the menu is still open.
    if (!(await item.isVisible())) await card.getByRole("button", { name: `More for ${name}` }).click();
    await item.click();
  };
  await remove();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText(name);
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(card).toBeVisible();
  // (The dashboard refreshes itself every 10 s, which can close the menu in between.)
  await expect(async () => {
    await remove();
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await page.getByTestId("confirm-yes").click();
  await expect(card).toHaveCount(0, { timeout: 15_000 });
  expect(dialogs).toBe(0); // never the browser's own box

  // Leftovers from an earlier failed run.
  const old = page.getByRole("link", { name: /^Open e2e-Confirm .*'s Classroom$/ });
  while (await old.count()) {
    const left = (await old.first().textContent())!.match(/e2e-Confirm \d+/)![0];
    await page.getByRole("button", { name: `More for ${left}` }).click();
    await page.getByRole("menuitem", { name: `Remove ${left}` }).click();
    await page.getByTestId("confirm-yes").click();
    await expect(page.getByRole("link", { name: `Open ${left}'s Classroom` })).toHaveCount(0, { timeout: 15_000 });
  }
});

test("QW: a waiting student shows in the tab title; text pad hint; write switch", async ({ page, browser }) => {
  test.setTimeout(150_000);
  await logIn(page);
  await openTestClassroom(page);
  const link = await page.getByRole("textbox", { name: /'s link$/ }).inputValue();
  const joinPath = new URL(`http://${link}`).pathname;
  await page.goto("/dashboard");

  // The student arrives before the teacher.
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const student = await context.newPage();
  await student.goto(joinPath);
  await student.getByLabel("Your name").fill("E2E Student");
  await student.getByRole("button", { name: "Join lesson" }).click();
  await expect(student.getByText("Waiting for your teacher to join…")).toBeVisible({ timeout: 30_000 });

  // The dashboard checks every 10 s: "(1) Test is waiting · …".
  await expect.poll(() => page.title(), { timeout: 40_000 }).toMatch(/^\(1\) Test is waiting · /);

  // Into the lesson: the empty text pad says what it's for; the switch lets the student write.
  await page
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: `Open ${TEST_CLASSROOM}'s Classroom` }) })
    .getByRole("link", { name: "Start lesson" })
    .click();
  await expect(page.getByRole("region", { name: "Lesson", exact: true })).toBeVisible({ timeout: 30_000 });
  // Clearing asks in our dialog first; then the empty pad shows its hint.
  await page.getByRole("button", { name: /^Clear the text/ }).click();
  await page.getByTestId("confirm-yes").click();
  await expect(page.locator(".tiptap p.is-editor-empty").first()).toHaveAttribute("data-placeholder", /sees it as you type/);
  const sw = page.getByRole("switch", { name: /can write and draw$/ });
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await sw.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveCount(1);
  await context.close();
});

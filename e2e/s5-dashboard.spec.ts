import { expect, test } from "@playwright/test";
import { logIn, TEST_CLASSROOM } from "./helpers";

// S5: the dashboard's cards, name chip and ⋯ menu (test account; nothing is removed).

test("S5 dashboard: classroom card, name chip, ⋯ menu", async ({ page }) => {
  await logIn(page);
  await expect(page.getByRole("heading", { name: "Your classrooms", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start a quick call" })).toBeVisible();

  const card = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: `Open ${TEST_CLASSROOM}'s classroom` }) });
  await expect(card).toBeVisible();
  await expect(card.getByRole("link", { name: "Start lesson" })).toBeVisible();
  await expect(card.getByRole("button", { name: `Copy ${TEST_CLASSROOM}'s student link` })).toBeVisible();
  await expect(card.getByText(/No files yet|picture|PDF|audio/)).toBeVisible();

  // Remove lives in the ⋯ menu now (not clicked: the test classroom stays).
  await card.getByRole("button", { name: `More for ${TEST_CLASSROOM}` }).click();
  await expect(page.getByRole("menuitem", { name: `Remove ${TEST_CLASSROOM}` })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitem", { name: `Remove ${TEST_CLASSROOM}` })).toHaveCount(0);

  // The name chip opens the name form.
  await page.getByRole("button", { name: /^Your name in lessons: / }).click();
  await expect(page.getByRole("textbox", { name: "Your name in lessons" })).toBeVisible();
  await page.keyboard.press("Escape");

  // The add card.
  await expect(page.getByLabel("Student's name")).toBeVisible();

  // Phones: the chip shrinks to the initial; the quick call button is full width.
  await page.setViewportSize({ width: 390, height: 844 });
  const quick = page.getByRole("button", { name: "Start a quick call" });
  expect((await quick.boundingBox())!.width).toBeGreaterThan(300);
});

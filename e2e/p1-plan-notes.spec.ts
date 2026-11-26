import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { confirmYes, logIn, openTestClassroom, TEST_CLASSROOM } from "./helpers";

// Review A4 + A5 (migration 0017): plan the next lesson (calendar file, dashboard, join page),
// and the text pad saved as a dated lesson note in the Classroom.

test("P1: next lesson on the Classroom, the dashboard card and the student's join page", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await logIn(page);
  await openTestClassroom(page);
  const card = page.getByRole("region", { name: "Next lesson" });
  // Leftover from an earlier run: start from "not planned".
  if (await card.getByRole("button", { name: "Change" }).isVisible()) {
    await card.getByRole("button", { name: "Change" }).click();
    await card.getByRole("button", { name: "No next lesson" }).click();
  }
  await card.getByRole("button", { name: "Plan the next lesson" }).click();
  // Default: a week from now, every week.
  await expect(card.getByLabel("Every week")).toBeChecked();
  await card.getByLabel("Time").fill("17:30");
  await card.getByRole("button", { name: "Save" }).click();
  const when = card.getByTestId("next-lesson-when");
  await expect(when).toContainText(/17:30|5:30\s?PM/, { timeout: 15_000 });
  await expect(when).toContainText("every week");

  // A past date is refused.
  await card.getByRole("button", { name: "Change" }).click();
  await card.getByLabel("Date").fill("2020-01-06");
  await expect(card.getByRole("alert")).toHaveText("This date is in the past.");
  await expect(card.getByRole("button", { name: "Save" })).toBeDisabled();
  await card.getByRole("button", { name: "Cancel" }).click();

  // The calendar file: a weekly event with the student link.
  const download = page.waitForEvent("download");
  await card.getByRole("button", { name: "Add to my calendar" }).click();
  const ics = readFileSync(await (await download).path(), "utf8");
  expect(ics).toContain("BEGIN:VEVENT");
  expect(ics).toContain("RRULE:FREQ=WEEKLY");
  expect(ics).toContain(`SUMMARY:Lesson with ${TEST_CLASSROOM}`);
  expect(ics).toMatch(/URL:http:\/\/localhost:3000\/join\/[a-z0-9]+/);
  const joinPath = ics.match(/URL:http:\/\/localhost:3000(\/join\/[a-z0-9]+)/)![1];

  // The dashboard card.
  await page.goto("/dashboard");
  const dashCard = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: `Open ${TEST_CLASSROOM}'s Classroom` }) });
  await expect(dashCard.getByTestId("card-next-lesson")).toContainText(/^Next: .*(17:30|5:30\s?PM)/);

  // The student's join page, with its own calendar file.
  const ctx = await browser.newContext();
  const s = await ctx.newPage();
  await s.goto(joinPath);
  const next = s.getByTestId("student-next-lesson");
  await expect(next).toContainText("Your next lesson");
  await expect(next).toContainText(/17:30|5:30\s?PM/);
  const sd = s.waitForEvent("download");
  await next.getByRole("button", { name: "Add to my calendar" }).click();
  expect(readFileSync(await (await sd).path(), "utf8")).toContain("BEGIN:VCALENDAR");
  await ctx.close();

  // Clean up: no next lesson.
  await openTestClassroom(page);
  await card.getByRole("button", { name: "Change" }).click();
  await card.getByRole("button", { name: "No next lesson" }).click();
  await expect(card.getByRole("button", { name: "Plan the next lesson" })).toBeVisible({ timeout: 15_000 });
});

test("P1: the text pad becomes a lesson note; it can be printed and deleted", async ({ page }) => {
  test.setTimeout(150_000);
  await logIn(page);
  await openTestClassroom(page);
  await page.getByRole("link", { name: "Start lesson" }).click();
  await page.waitForURL(/\/lesson\/[0-9a-f-]+$/);
  await expect(page.getByRole("region", { name: "Lesson", exact: true })).toBeVisible({ timeout: 30_000 });

  const words = `e2e note ${Date.now()}`;
  // Other tests leave a long pad behind (notes keep 50 000 characters): start empty.
  await page.getByRole("button", { name: /^Clear the text/ }).click();
  await confirmYes(page);
  await page.waitForTimeout(2500); // the pad's first moments aren't saved (useNoteAutosave)
  await page.getByLabel("Text pad").click();
  await page.keyboard.type(words);
  await expect(page.getByTestId("note-saved")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Leave the lesson" }).click();
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  await openTestClassroom(page);
  const notes = page.getByRole("region", { name: "Lesson notes" });
  const note = notes.getByTestId("lesson-note").filter({ hasText: words });
  await expect(note).toBeVisible();

  // The print page shows the note on its own.
  const [print] = await Promise.all([page.waitForEvent("popup"), note.getByRole("link", { name: "Print or save as PDF" }).click()]);
  await expect(print.getByRole("heading", { name: `Lesson with ${TEST_CLASSROOM}` })).toBeVisible();
  await expect(print.getByText(words)).toBeVisible();
  await print.close();

  // Delete it (our confirm dialog).
  await note.getByRole("button", { name: /^Delete the note of / }).click();
  await confirmYes(page);
  await expect(note).toHaveCount(0, { timeout: 15_000 });
});

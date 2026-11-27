import { expect, test } from "@playwright/test";
import { clearTestLessons, logIn, openTestClassroom, TEST_CLASSROOM } from "./helpers";

// The calendar (migration 0018): plan from the dashboard's Today, the week page, a lesson's
// card (start, cancel one of a weekly series, bring it back, move one), the calendar feed.
// Uses only the "Test" Classroom and removes its lessons again.

const two = (n: number) => String(n).padStart(2, "0");
const dayInput = (d: Date) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;

test("K1: plan a lesson today, see it in Today and the week, change and cancel it, the feed", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await logIn(page);
  await openTestClassroom(page);
  await clearTestLessons(page);

  // Nothing planned: no Today column, the Classrooms take the width.
  await page.goto("/dashboard");
  const today = page.getByRole("complementary", { name: "Today", exact: true });
  await expect(page.getByRole("heading", { name: "Your Classrooms", exact: true })).toBeVisible();
  await expect(today).toHaveCount(0);
  // Plan a lesson a few minutes from now (before midnight), every week, in the calendar.
  await page.goto("/dashboard/calendar");
  await page.getByRole("button", { name: "Plan a lesson", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New lesson" });
  await dialog.getByLabel("Classroom").selectOption({ label: TEST_CLASSROOM });
  const soon = new Date(Date.now() + 5 * 60_000);
  if (soon.getDate() !== new Date().getDate()) test.skip(true, "too close to midnight");
  await dialog.getByLabel("Day").fill(dayInput(soon));
  await dialog.getByLabel("Time").fill(`${two(soon.getHours())}:${two(soon.getMinutes())}`);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toHaveCount(0, { timeout: 15_000 });

  await page.goto("/dashboard");
  await expect(today).toBeVisible();
  const row = today.getByTestId("today-list").getByRole("listitem").filter({ hasText: TEST_CLASSROOM });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(row).toContainText("60 min");
  // Within 15 minutes of the start: Start is the main button and opens the lesson.
  await expect(row.getByRole("link", { name: `Start lesson: ${TEST_CLASSROOM}` })).toHaveAttribute("href", /\/lesson\/[0-9a-f-]+$/);
  // The card on the left says when.
  const card = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: `Open ${TEST_CLASSROOM}'s Classroom` }) });
  await expect(card.getByTestId("card-next-lesson")).toBeVisible();

  // The week page shows it today and next week.
  await page.getByRole("navigation", { name: "Your pages" }).getByRole("link", { name: "Calendar" }).click();
  await page.waitForURL("**/dashboard/calendar");
  const lessons = page.getByTestId("week-lesson").filter({ hasText: TEST_CLASSROOM });
  await expect(lessons).toHaveCount(1);
  await page.getByRole("button", { name: "Next week" }).click();
  await expect(lessons).toHaveCount(1);

  // Next week's lesson: cancel only this one; it stays, struck through; bring it back.
  await lessons.first().click();
  let card2 = page.getByRole("dialog", { name: TEST_CLASSROOM });
  await card2.getByRole("button", { name: "Cancel this lesson" }).click();
  await card2.getByRole("button", { name: "Only this lesson" }).click();
  await expect(card2).toHaveCount(0, { timeout: 15_000 });
  await expect(lessons.first()).toHaveClass(/line-through/, { timeout: 15_000 });
  await lessons.first().click();
  card2 = page.getByRole("dialog", { name: TEST_CLASSROOM });
  await card2.getByRole("button", { name: "Bring it back" }).click();
  await expect(lessons.first()).not.toHaveClass(/line-through/, { timeout: 15_000 });

  // Move only that one to 07:30 the day after, 30 min.
  await lessons.first().click();
  await page.getByRole("dialog", { name: TEST_CLASSROOM }).getByRole("button", { name: "Change the time" }).click();
  const change = page.getByRole("dialog", { name: /Change lesson/ });
  const nextWeek = new Date(soon.getTime() + 8 * 24 * 60 * 60_000);
  await change.getByLabel("Day").fill(dayInput(nextWeek));
  await change.getByLabel("Time").fill("07:30");
  await change.getByText("30 min").click();
  await expect(change.getByRole("radio", { name: "Only this lesson" })).toBeChecked();
  await change.getByRole("button", { name: "Save" }).click();
  await expect(change).toHaveCount(0, { timeout: 15_000 });
  const moved = lessons.filter({ hasText: /07:30|7:30\s?AM/ });
  if (nextWeek.getDay() === 1) await page.getByRole("button", { name: "Next week" }).click(); // moved over Sunday
  await expect(moved).toHaveCount(1, { timeout: 15_000 });

  // The private calendar link: weekly event with the moved lesson as its own event.
  await page.goto("/dashboard/calendar");
  await page.getByRole("button", { name: "Add to Google / Apple calendar" }).click();
  const url = await page.getByRole("textbox", { name: "Your lessons in your own calendar" }).inputValue();
  expect(url).toMatch(/\/api\/calendar\/[0-9a-f]{64}\.ics$/);
  const feed = await page.request.get(url);
  expect(feed.status()).toBe(200);
  expect(feed.headers()["content-type"]).toContain("text/calendar");
  const ics = await feed.text();
  expect(ics).toContain(`SUMMARY:Lesson with ${TEST_CLASSROOM}`);
  expect(ics).toContain("RRULE:FREQ=WEEKLY");
  expect(ics).toMatch(/EXDATE;TZID=/);
  expect(ics.match(/BEGIN:VEVENT/g)?.length).toBeGreaterThanOrEqual(2);
  // A made-up link: nothing.
  expect((await page.request.get(url.replace(/[0-9a-f]{64}/, "0".repeat(64)))).status()).toBe(404);

  // Clean up.
  await page.goto("/dashboard");
  await openTestClassroom(page);
  await clearTestLessons(page);
});

test("K1: on a phone the week is a list", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await logIn(page);
  await page.goto("/dashboard/calendar");
  await expect(page.getByTestId("week-agenda")).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Today · / })).toBeVisible();
});

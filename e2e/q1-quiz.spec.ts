import { expect, type Page, test } from "@playwright/test";
import { joinAsStudent, logIn, startTestLesson } from "./helpers";

// Q1: the teacher makes a quiz in the dashboard, drags it into the lesson, the student answers
// live, the teacher checks; the result is saved in the Classroom. The quiz is called "e2e-…"
// and deleted at the end.
const TITLE = `e2e-Quiz ${Date.now()}`;

async function deleteE2eQuizzes(page: Page) {
  await page.goto("/dashboard");
  for (;;) {
    const card = page.getByRole("link", { name: /^Edit the quiz e2e-/ }).first();
    if (!(await card.count())) return;
    await card.click();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Delete quiz" }).click();
    await page.waitForURL("**/dashboard");
  }
}

test("Q1: make a quiz, drag it into the lesson, the student answers, the teacher checks", async ({ page, browser }) => {
  test.setTimeout(180_000);
  await logIn(page);
  await deleteE2eQuizzes(page);

  // Dashboard → New quiz → editor.
  await page.getByRole("button", { name: "New quiz" }).click();
  await page.waitForURL(/\/dashboard\/quiz\/[0-9a-f-]+$/);
  await page.getByLabel("Quiz title").fill(TITLE);
  const q1 = page.getByRole("listitem", { name: "Question 1" });
  await q1.getByLabel("Question", { exact: true }).fill("Which one is a fruit?");
  await q1.getByLabel("Answer 1", { exact: true }).fill("Carrot");
  await q1.getByLabel("Answer 2", { exact: true }).fill("Apple");
  await q1.getByRole("radio", { name: "Answer 2 is right" }).click();
  await page.getByRole("button", { name: "Fill the gaps" }).last().click();
  const q2 = page.getByRole("listitem", { name: "Question 2" });
  await q2.getByLabel("Text").fill("Yesterday I [went] home and [saw/watched] a film.");
  await expect(q2.getByText("Your student sees:")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Saved", { timeout: 15_000 });

  // It's on the dashboard.
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: `Edit the quiz ${TITLE}` })).toContainText("2 questions");

  // In the lesson: drag it from the files panel onto the stage.
  const joinPath = await startTestLesson(page);
  const student = await joinAsStudent(browser, joinPath);
  const panel = page.getByRole("complementary", { name: /files$/ });
  const item = panel.getByRole("button", { name: TITLE });
  await item.dragTo(page.getByTestId("stage"));
  const drop = page.getByText(/^Open beside|^Drop/).first();
  if (await drop.isVisible().catch(() => false)) await item.dragTo(drop);
  await expect(page.getByRole("tab", { name: TITLE })).toBeVisible({ timeout: 15_000 });
  await expect(student.getByRole("tab", { name: TITLE })).toBeVisible({ timeout: 20_000 });

  // The student answers: one right, one gap wrong.
  const sq = student.getByTestId("quiz");
  await sq.getByRole("radio", { name: /Apple/ }).click();
  await sq.getByLabel("Gap 1").fill("go");
  await sq.getByLabel("Gap 2").fill("Watched.");
  // The teacher sees it live.
  const tq = page.getByTestId("quiz");
  await expect(tq.getByRole("radio", { name: /Apple/ })).toHaveAttribute("aria-checked", "true", { timeout: 15_000 });
  await expect(tq.getByLabel("Gap 2")).toHaveValue("Watched.");
  await sq.getByRole("button", { name: "I'm done" }).click();
  await expect(tq.getByText("E2E Student is done.")).toBeVisible({ timeout: 15_000 });

  // The teacher checks: 2 of 3 (the choice and "watched" right, "go" wrong), shown to both.
  await tq.getByRole("button", { name: "Check answers" }).click();
  await expect(tq.getByTestId("quiz-result")).toHaveText("2 of 3 right");
  await expect(sq.getByTestId("quiz-result")).toHaveText("2 of 3 right", { timeout: 15_000 });
  await expect(sq.getByText("went")).toBeVisible(); // the solution under the wrong gap
  await expect(tq.getByText(/^Saved in /)).toBeVisible({ timeout: 15_000 });

  await student.context().close();
  await page.getByRole("button", { name: "Leave the lesson" }).click();

  // The result is in the Classroom.
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Open Test's Classroom" }).click({ position: { x: 8, y: 8 } });
  const results = page.getByRole("region", { name: "Quiz results" });
  await expect(results.getByText(TITLE).first()).toBeVisible({ timeout: 15_000 });
  await expect(results.getByText("2/3").first()).toBeVisible();
  for (;;) {
    const remove = results.getByRole("button", { name: /^Remove the result of e2e-/ }).first();
    if (!(await remove.count())) break;
    await remove.click();
    await expect(remove).toBeHidden({ timeout: 10_000 }).catch(() => {});
  }
  await deleteE2eQuizzes(page);
});

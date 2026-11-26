import { expect, type Page, test } from "@playwright/test";
import { confirmYes, joinAsStudent, logIn, openTestClassroom, TEST_CLASSROOM } from "./helpers";

// Q1: the teacher makes a quiz in the dashboard, drags it into the lesson, the student answers
// live, the teacher checks; the result is saved in the Classroom. The quiz is called "e2e-…"
// and deleted at the end.
const TITLE = `e2e-Quiz ${Date.now()}`;

async function deleteE2eQuizzes(page: Page) {
  for (;;) {
    await page.goto("/dashboard");
    // The dashboard streams in: wait for it before counting.
    await expect(page.getByRole("heading", { name: "Your quizzes" })).toBeVisible({ timeout: 30_000 });
    const card = page.getByRole("link", { name: /^Edit the quiz e2e-/ }).first();
    if (!(await card.count())) return;
    await page.goto((await card.getAttribute("href"))!);
    await page.getByRole("button", { name: "More for this quiz" }).click();
    await page.getByRole("menuitem", { name: "Delete quiz" }).click();
    await confirmYes(page);
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
  }
}

test("Q1: make a quiz, drag it into the lesson, the student answers, the teacher checks", async ({ page, browser }) => {
  test.setTimeout(180_000);
  await logIn(page);
  await deleteE2eQuizzes(page);
  // A fresh page load: Next keeps pages visited by client navigation hidden in the DOM, and
  // an old quiz editor would match the locators below.
  await page.goto("/dashboard");

  // Dashboard → New quiz → editor (it starts with one open multiple-choice question).
  await page.getByRole("button", { name: "New quiz" }).click();
  await page.waitForURL(/\/dashboard\/quiz\/[0-9a-f-]+$/);
  await page.getByLabel("Quiz title").fill(TITLE);
  const blocks = page.getByRole("complementary", { name: "Question blocks" });
  const card = (n: number) => page.getByRole("listitem", { name: `Question ${n}` });

  await card(1).getByLabel("Question", { exact: true }).fill("Which one is a fruit?");
  await card(1).getByLabel("Answer 1", { exact: true }).fill("Carrot");
  await card(1).getByLabel("Answer 2", { exact: true }).fill("Apple");
  await card(1).getByRole("checkbox", { name: "Answer 2 is right" }).click();
  await card(1).getByRole("checkbox", { name: "Answer 1 is right" }).click();

  // An incomplete question is marked (and left out of lessons).
  await blocks.getByRole("button", { name: /^Open answer/ }).click();
  await expect(page.getByTestId("quiz-incomplete")).toHaveText("1 question is incomplete: it isn't shown in lessons.");
  await card(2).getByRole("button", { name: "Remove" }).click();
  await expect(page.getByTestId("quiz-incomplete")).toBeHidden();

  // A click on a block adds it below the open question and opens it.
  await blocks.getByRole("button", { name: /^Fill the gaps/ }).click();
  await card(2).getByLabel("Text").fill("Yesterday I [went] home and [saw/watched] a film.");
  await expect(card(2).getByText("Your student sees:")).toBeVisible();
  await blocks.getByRole("button", { name: /^Choose in the text/ }).click();
  await card(3).getByLabel("Text").fill("We [flew/flied] to Lisbon and [ate|eated] fish.");
  await blocks.getByRole("button", { name: /^Match pairs/ }).click();
  await card(4).getByLabel("Left 1").fill("go");
  await card(4).getByLabel("Right 1").fill("went");
  await card(4).getByLabel("Left 2").fill("see");
  await card(4).getByLabel("Right 2").fill("saw");
  await blocks.getByRole("button", { name: /^Put in order/ }).click();
  await card(5).getByLabel("The sentence, in the right order").fill("I like green tea");
  await blocks.getByRole("button", { name: /^Open answer/ }).click();
  await card(6).getByLabel("Question", { exact: true }).fill("Describe your weekend.");
  await card(6).getByLabel("Explanation (shown after checking)").fill("Past simple, please!");

  // Dragging a block in: True or false, dropped above question 1.
  await page.evaluate(() => window.scrollTo(0, 0));
  await blocks.getByRole("button", { name: /^True or false/ }).hover();
  await page.mouse.down();
  const first = (await card(1).boundingBox())!;
  await page.mouse.move(first.x + first.width / 2, first.y + 10, { steps: 8 });
  await expect(page.getByText("Drop here")).toBeVisible();
  // Plain mouse moves (as in l2a-file-tabs): settle on the drop area, then let go.
  await page.waitForTimeout(300);
  const slot = (await page.getByText("Drop here").boundingBox())!;
  await page.mouse.move(slot.x + slot.width / 2, slot.y + slot.height / 2, { steps: 4 });
  await page.mouse.up();
  await card(1).getByLabel("Statement").fill("“Buyed” is the past of “buy”.");
  await card(1).getByRole("button", { name: "False" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved", { timeout: 15_000 });

  // Not in a Classroom yet; the pill adds it to the test Classroom.
  const rooms = page.getByRole("region", { name: "In these Classrooms" });
  await expect(rooms).toContainText("Add it to a Classroom to use it in a lesson.");
  await rooms.getByRole("button", { name: TEST_CLASSROOM }).click();
  await expect(rooms.getByRole("button", { name: TEST_CLASSROOM })).toHaveAttribute("aria-pressed", "true");
  await expect(rooms).toContainText("You can open it in their lessons.");

  // It's on the dashboard.
  await page.goto("/dashboard");
  const quizCard = page.getByRole("link", { name: `Edit the quiz ${TITLE}` });
  await expect(quizCard).toContainText("7 questions");
  await expect(quizCard).toContainText("1 Classroom");

  // In the lesson: drag it from the files panel onto the stage.
  // (startTestLesson logs in again, which a logged-in teacher can't: the steps by hand.)
  await openTestClassroom(page);
  // The Classroom lists it; taking it out and adding it back from here works too.
  const here = page.getByRole("region", { name: "Quizzes" });
  await here.getByRole("button", { name: `Take “${TITLE}” out of this Classroom` }).click();
  await expect(here.getByRole("link", { name: new RegExp(TITLE) })).toHaveCount(0);
  await here.getByLabel("Add a quiz to this Classroom").selectOption({ label: TITLE });
  await here.getByRole("button", { name: "Add", exact: true }).click();
  await expect(here.getByRole("link", { name: new RegExp(TITLE) })).toContainText("7 questions");
  const link = await page.getByRole("textbox", { name: /'s link$/ }).inputValue();
  await page.getByRole("link", { name: "Start lesson" }).click();
  await expect(page.getByRole("region", { name: "Lesson", exact: true })).toBeVisible({ timeout: 30_000 });
  const joinPath = new URL(`http://${link}`).pathname;
  const student = await joinAsStudent(browser, joinPath);
  const panel = page.getByRole("complementary", { name: /files$/ });
  // A real mouse drag, as in l2a-file-tabs (Playwright's dragTo doesn't drive HTML5 drags here).
  await panel.getByRole("button", { name: TITLE }).hover();
  await page.mouse.down();
  await page.mouse.move(700, 400, { steps: 5 });
  await expect(page.getByTestId("drop-zones")).toBeVisible();
  await page.waitForTimeout(300);
  const zone = (await page.getByTestId("drop-1").boundingBox())!;
  await page.mouse.move(zone.x + zone.width / 2, zone.y + zone.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole("tab", { name: TITLE })).toBeVisible({ timeout: 15_000 });
  await expect(student.getByRole("tab", { name: TITLE })).toBeVisible({ timeout: 20_000 });

  // The student answers every kind; one gap wrong.
  const sq = student.getByTestId("quiz");
  const sQ = (n: number) => sq.getByRole("listitem", { name: `Question ${n}` });
  await sQ(1).getByRole("radio", { name: /False/ }).click();
  await sQ(2).getByRole("radio", { name: /Apple/ }).click();
  await sQ(3).getByLabel("Gap 1").fill("go");
  await sQ(3).getByLabel("Gap 2").fill("Watched.");
  await sQ(4).getByLabel("Gap 1").selectOption({ label: "flew" });
  await sQ(4).getByLabel("Gap 2").selectOption({ label: "ate" });
  await sQ(5).getByRole("button", { name: "go", exact: true }).click();
  await sQ(5).getByRole("button", { name: "went", exact: true }).click();
  await sQ(5).getByRole("button", { name: "see", exact: true }).click();
  await sQ(5).getByRole("button", { name: "saw", exact: true }).click();
  for (const word of ["I", "like", "green", "tea"]) {
    await sQ(6).getByLabel("Pieces").getByRole("button", { name: word, exact: true }).click();
  }
  await sQ(7).getByLabel("Write your answer here…").fill("I went to the lake.");

  // The teacher sees it live.
  const tq = page.getByTestId("quiz");
  const tQ = (n: number) => tq.getByRole("listitem", { name: `Question ${n}` });
  await expect(tQ(2).getByRole("radio", { name: /Apple/ })).toHaveAttribute("aria-checked", "true", { timeout: 15_000 });
  await expect(tQ(3).getByLabel("Gap 2")).toHaveValue("Watched.");
  await expect(tQ(7).getByLabel("Write your answer here…")).toHaveValue("I went to the lake.", { timeout: 15_000 });
  await sq.getByRole("button", { name: "I'm done" }).click();
  await expect(tq.getByText("Mark the open answers first.")).toBeVisible({ timeout: 15_000 });
  await expect(tq.getByRole("button", { name: "Check answers" })).toBeDisabled();
  await tQ(7).getByRole("button", { name: "Right" }).click();
  await expect(tq.getByText("E2E Student is done.")).toBeVisible({ timeout: 15_000 });

  // The teacher checks: 9 of 10 (only the gap "go" is wrong), shown to both.
  await tq.getByRole("button", { name: "Check answers" }).click();
  await expect(tq.getByTestId("quiz-result")).toHaveText("9 of 10 right");
  await expect(sq.getByTestId("quiz-result")).toHaveText("9 of 10 right", { timeout: 15_000 });
  await expect(sQ(3).getByText("went")).toBeVisible(); // the solution under the wrong gap
  await expect(sQ(7).getByText("Past simple, please!")).toBeVisible(); // the explanation
  await expect(tq.getByText(/^Saved in /)).toBeVisible({ timeout: 15_000 });

  await student.context().close();
  await page.getByRole("button", { name: "Leave the lesson" }).click();

  // The result is in the Classroom.
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Open Test's Classroom" }).click({ position: { x: 8, y: 8 } });
  const results = page.getByRole("region", { name: "Quiz results" });
  await expect(results.getByText(TITLE).first()).toBeVisible({ timeout: 15_000 });
  await expect(results.getByText("9/10").first()).toBeVisible();
  for (;;) {
    const remove = results.getByRole("button", { name: /^Remove the result of e2e-/ }).first();
    if (!(await remove.count())) break;
    await remove.click();
    await expect(remove).toBeHidden({ timeout: 10_000 }).catch(() => {});
  }
  await deleteE2eQuizzes(page);
});

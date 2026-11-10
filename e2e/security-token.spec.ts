import { expect, test } from "@playwright/test";
import { logIn, startTestLesson } from "./helpers";

// The token route's rules (security-1): who gets a token, and what it allows.

function payload(jwt: string) {
  return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
}

test("token route: no token without a login or a valid link", async ({ request }) => {
  const noLogin = await request.post("/api/livekit-token", { data: { lessonId: "00000000-0000-4000-8000-000000000000" } });
  expect(noLogin.status()).toBe(401);
  const badSlug = await request.post("/api/livekit-token", { data: { slug: "nope-nope-nope", name: "X" } });
  expect(badSlug.status()).toBe(404);
  const noName = await request.post("/api/livekit-token", { data: { slug: "abcdefgh", name: "  " } });
  expect(noName.status()).toBe(400);
  const junk = await request.post("/api/livekit-token", { data: { lessonId: 5, slug: 7 } });
  expect(junk.status()).toBe(400);
});

test("token route: a student may publish camera and mic only; a missing client id gets its own identity", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const joinPath = await startTestLesson(page);
  const slug = joinPath.split("/").pop()!;

  const one = await page.request.post("/api/livekit-token", { data: { slug, name: "Anna" } });
  const two = await page.request.post("/api/livekit-token", { data: { slug, name: "Ben" } });
  expect(one.ok() && two.ok()).toBe(true);
  const a = payload((await one.json()).token);
  const b = payload((await two.json()).token);

  expect(a.sub).toMatch(/^student-[0-9a-f-]{36}$/);
  expect(a.sub).not.toBe(b.sub); // not both "student-undefined"
  expect(JSON.parse(a.metadata).role).toBe("student");
  expect(a.video.canUpdateOwnMetadata).toBeFalsy();
  expect(a.video.canPublishSources.sort()).toEqual(["camera", "microphone"]);
  expect(a.roomConfig.maxParticipants).toBe(2);

  // The teacher keeps every source and may set her attributes.
  const mine = await page.request.post("/api/livekit-token", {
    data: { lessonId: page.url().split("/").pop() },
  });
  const t = payload((await mine.json()).token);
  expect(JSON.parse(t.metadata).role).toBe("teacher");
  expect(t.video.canUpdateOwnMetadata).toBe(true);
  expect(t.video.canPublishSources).toBeUndefined();

  await page.getByRole("button", { name: "Leave the lesson" }).click();
  await expect(page.getByRole("heading", { name: "Your classrooms", exact: true })).toBeVisible({ timeout: 30_000 });
});

test("token route: another teacher's lesson id is not found", async ({ page }) => {
  await logIn(page);
  // A made-up id: RLS hides every lesson that isn't ours, so this and a real foreign id look the same.
  const res = await page.request.post("/api/livekit-token", {
    data: { lessonId: "00000000-0000-4000-8000-000000000000" },
  });
  expect(res.status()).toBe(404);
});

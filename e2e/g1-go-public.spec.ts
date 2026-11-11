import { expect, test } from "@playwright/test";
import { logIn } from "./helpers";

// G1: going public. Open sign-up (no invite code) with the terms linked, the legal pages,
// a friendly 404, the Feedback button, and the webhook refusing calls that aren't LiveKit's.
// The CAPTCHA (Turnstile) is off here: it needs NEXT_PUBLIC_TURNSTILE_SITE_KEY at build time.

test("G1: open sign-up, legal pages, 404", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("textbox", { name: "Invite code" })).toHaveCount(0);
  await page.getByRole("link", { name: "privacy policy" }).click();
  await expect(page.getByRole("heading", { name: "Privacy policy" })).toBeVisible();
  await expect(page.getByText("not recorded")).toBeVisible();
  await page.getByRole("link", { name: "Terms" }).click();
  await expect(page.getByRole("heading", { name: "Terms of use" })).toBeVisible();
  await expect(page.getByText("50 MB of files per teacher")).toBeVisible();

  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page doesn't exist" })).toBeVisible();
});

test("G1: the Feedback button opens a form", async ({ page }) => {
  await logIn(page);
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByRole("textbox", { name: /What works/ })).toBeFocused();
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("textbox", { name: /What works/ })).toHaveCount(0);
});

test("G1: the LiveKit webhook refuses unsigned calls", async ({ request }) => {
  const res = await request.post("/api/livekit-webhook", {
    data: { event: "room_started", room: { sid: "RM_x", name: "lesson-x" } },
    headers: { Authorization: "not-a-signature" },
  });
  expect(res.status()).toBe(401);
});

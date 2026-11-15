import { expect, test } from "@playwright/test";

// Google sign-in: the button sends the browser to Supabase's Google sign-in (the rest happens at
// Google, which a test can't do), and a failed return shows a message. Needs
// NEXT_PUBLIC_GOOGLE_SIGNIN=on in .env.local.
test("Google sign-in: button on login and sign-up, starts Supabase's Google flow", async ({ page }) => {
  test.skip(process.env.NEXT_PUBLIC_GOOGLE_SIGNIN !== "on", "Google sign-in is off here");
  await page.goto("/signup");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await page.goto("/login?google=failed");
  await expect(page.getByText("Google sign-in didn't finish")).toBeVisible();

  const leaving = page.waitForRequest((r) => /\/auth\/v1\/authorize\?provider=google/.test(r.url()));
  await page.getByRole("button", { name: "Continue with Google" }).click();
  const url = new URL((await leaving).url());
  expect(url.searchParams.get("redirect_to")).toMatch(/\/auth\/callback$/);
});

test("Google sign-in: a callback without a valid code goes back to login", async ({ page }) => {
  await page.goto("/auth/callback?code=not-a-real-code");
  await expect(page).toHaveURL(/\/login\?google=failed$/);
});

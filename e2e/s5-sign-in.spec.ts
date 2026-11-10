import { expect, test } from "@playwright/test";

// S5: the sign-in pages' shared layout. Never creates accounts or sends emails.

test("S5 sign-in: two columns on desktop, form only on phones", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Teacher login" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Every lesson in one calm room." })).toBeVisible();
  await expect(page.getByText("Are you a student?")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Every lesson in one calm room." })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Teacher login" })).toBeVisible();
});

test("S5 sign-in: show/hide password, error banner, links", async ({ page }) => {
  await page.goto("/");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("not-the-password-1");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");

  // A made-up account: the banner, and the fields get a danger border (aria-invalid).
  await page.getByLabel("Email").fill("nobody-e2e@example.invalid");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /email or password|valid email/i })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
  await page.getByRole("link", { name: "Back to login" }).click();
  await page.getByRole("link", { name: "Create a teacher account" }).click();
  await expect(page.getByRole("heading", { name: "Create a teacher account" })).toBeVisible();
});

test("S5 sign-up: the password rules tick off; one button shows both fields", async ({ page }) => {
  await page.goto("/signup");
  const rules = page.locator("#password-rules li");
  await expect(rules.filter({ hasText: "(not yet)" })).toHaveCount(2);
  await page.getByLabel("Password", { exact: true }).fill("abcdefghij1");
  await expect(rules.filter({ hasText: "(done)" })).toHaveCount(2);
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Confirm password")).toHaveAttribute("type", "text");
  await page.getByLabel("Confirm password").fill("different1234");
  await expect(page.getByText("The two passwords don't match.")).toBeVisible();
});

test("S5 link expired", async ({ page }) => {
  await page.goto("/link-expired");
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
});

import { expect, type Page, type Route, test } from "@playwright/test";
import { deleteTestFiles, joinAsStudent, logIn, openTestClassroom, testPdf } from "./helpers";

// C1: Settings › Connected clouds, files from Dropbox into a Classroom, recordings saved to
// Dropbox and Google Drive. Google and Dropbox are simulated (page.route): real sign-ins
// can't run here, so the real services are checked by hand on a real computer.
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, PUT, OPTIONS",
  "access-control-expose-headers": "Location",
};
const json = (route: Route, body: unknown, headers: Record<string, string> = {}) =>
  route.request().method() === "OPTIONS"
    ? route.fulfill({ status: 204, headers: CORS })
    : route.fulfill({ status: 200, contentType: "application/json", headers: { ...CORS, ...headers }, body: JSON.stringify(body) });

async function record(page: Page, student: Page) {
  await page.getByRole("button", { name: "Record", exact: true }).click();
  const d = page.getByRole("dialog", { name: "Record this lesson" });
  await d.getByLabel("Cameras").uncheck();
  await d.getByLabel("Lesson screen").uncheck();
  await d.getByRole("button", { name: "Ask E2E Student and record" }).click();
  await student.getByRole("dialog", { name: "Record this lesson?" }).getByRole("button", { name: "Allow", exact: true }).click();
  await expect(page.getByTestId("rec-pill")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(3000);
  await page.getByTestId("rec-pill").getByRole("button", { name: "Stop" }).click();
}

test("C1: connect Dropbox, add a file from it, save recordings to Dropbox and Google Drive", async ({ page, browser }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });

  // Fake Dropbox.
  const uploads: { path: string; args: Record<string, unknown> }[] = [];
  await page.route("https://www.dropbox.com/oauth2/authorize**", (r) => r.fulfill({ contentType: "text/html", body: "<p>Dropbox</p>" }));
  await page.route("https://api.dropboxapi.com/oauth2/token", (r) =>
    json(r, { access_token: "e2e-at", expires_in: 14400, refresh_token: "e2e-rt", token_type: "bearer" }),
  );
  await page.route("https://api.dropboxapi.com/2/users/get_current_account", (r) => json(r, { email: "e2e@example.com" }));
  await page.route("https://content.dropboxapi.com/2/files/**", (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: CORS });
    const path = new URL(r.request().url()).pathname.replace("/2/files/", "");
    const args = JSON.parse(r.request().headers()["dropbox-api-arg"] ?? "{}");
    uploads.push({ path, args });
    const commit = (args.commit as { path?: string } | undefined)?.path;
    return json(r, path.endsWith("start") ? { session_id: "s1" } : commit ? { path_display: commit } : null);
  });
  await page.route("https://dl.dropboxusercontent.com/**", (r) =>
    r.fulfill({ status: 200, contentType: "application/pdf", headers: CORS, body: testPdf(1) }),
  );
  // Fake Google Drive (the token is put in this tab's storage below).
  let driveBody = 0;
  await page.route("https://www.googleapis.com/drive/v3/files?q=**", (r) => json(r, { files: [] }));
  await page.route("https://www.googleapis.com/drive/v3/files?fields=id", (r) => json(r, { id: "folder-e2e" }));
  await page.route("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable**", (r) =>
    json(r, {}, { Location: "https://www.googleapis.com/upload/drive/v3/files?upload_id=e2e" }),
  );
  await page.route("https://www.googleapis.com/upload/drive/v3/files?upload_id=e2e", (r) => {
    driveBody = r.request().postDataBuffer()?.length ?? 0;
    return json(r, { id: "file-e2e" });
  });
  // Dropbox's Chooser, already "loaded": it picks one PDF.
  await page.addInitScript(() => {
    (window as unknown as { Dropbox: unknown }).Dropbox = {
      choose: (o: { success: (f: unknown[]) => void }) =>
        setTimeout(() => o.success([{ link: "https://dl.dropboxusercontent.com/e2e/e2e-cloud.pdf", name: "e2e-cloud.pdf", bytes: 900 }]), 50),
    };
  });

  await logIn(page);
  // Settings: both clouds offered, nothing connected.
  await page.getByRole("button", { name: /^Account: / }).click();
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Connected clouds" })).toBeVisible();
  const dropbox = page.getByRole("listitem", { name: "Dropbox" });
  await expect(page.getByRole("listitem", { name: "Google Drive" })).toContainText("Not connected");
  await expect(dropbox).toContainText("Not connected");
  await expect(page.getByRole("radio", { name: /Save to Dropbox/ })).toBeDisabled();

  // Connect Dropbox: off to Dropbox with PKCE, back with a code.
  const authorize = page.waitForRequest("https://www.dropbox.com/oauth2/authorize**");
  await dropbox.getByRole("button", { name: "Connect" }).click();
  const q = new URL((await authorize).url()).searchParams;
  expect(q.get("code_challenge_method")).toBe("S256");
  expect(q.get("token_access_type")).toBe("offline");
  expect(q.get("redirect_uri")).toBe("http://localhost:3000/cloud/dropbox");
  await page.goto(`/cloud/dropbox?code=e2e-code&state=${q.get("state")}`);
  await page.waitForURL("**/dashboard/settings");
  await expect(dropbox).toContainText("Connected as e2e@example.com");
  await page.getByRole("radio", { name: /Save to Dropbox/ }).check();

  // A file from Dropbox into the Classroom.
  await page.goto("/dashboard");
  await openTestClassroom(page);
  await deleteTestFiles(page);
  await expect(page.getByRole("button", { name: "From Google Drive" })).toBeVisible();
  await page.getByRole("button", { name: "From Dropbox" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "e2e-cloud.pdf" })).toBeVisible({ timeout: 20_000 });

  // A lesson: the recording goes to Dropbox by itself.
  const link = await page.getByRole("textbox", { name: /'s link$/ }).inputValue();
  await page.getByRole("link", { name: "Start lesson" }).click();
  await expect(page.getByRole("region", { name: "Lesson", exact: true })).toBeVisible({ timeout: 30_000 });
  const student = await joinAsStudent(browser, new URL(`http://${link}`).pathname);
  try {
    await record(page, student);
    await expect(page.getByText(/^Saved to Dropbox: Apps\/TeachingTime\/Recordings\/TeachingTime – E2E Student – /)).toBeVisible({
      timeout: 20_000,
    });
    expect(uploads.map((u) => u.path)).toEqual(["upload_session/start", "upload_session/finish"]);
    expect((uploads[1].args.commit as { path: string }).path).toMatch(/^\/Recordings\/TeachingTime – E2E Student – .*\.(m4a|webm)$/);

    // Now Google Drive (connected, with a token in this tab).
    await page.evaluate(() => {
      localStorage.setItem("tt-cloud", JSON.stringify({ ...JSON.parse(localStorage.getItem("tt-cloud") ?? "{}"), google: { email: "e2e@gmail.com" }, saveTo: "google" }));
      sessionStorage.setItem("tt-google-token", JSON.stringify({ token: "e2e-google", expires: Date.now() + 3_600_000 }));
    });
    await record(page, student);
    await expect(page.getByText(/^Saved to Google Drive: TeachingTime recordings\/TeachingTime – E2E Student – /)).toBeVisible({
      timeout: 20_000,
    });
    expect(driveBody).toBeGreaterThan(1000);
  } finally {
    await student.context().close();
    await page.getByRole("button", { name: "Leave the lesson" }).click();
    await page.evaluate(() => localStorage.removeItem("tt-cloud"));
    await page.goto("/dashboard");
    await openTestClassroom(page);
    await deleteTestFiles(page);
  }
});

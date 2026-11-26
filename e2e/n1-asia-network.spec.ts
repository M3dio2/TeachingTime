import { expect, test } from "@playwright/test";
import { detectInAppBrowser, verdictOf } from "../lib/inAppBrowser";
import { logIn, openTestClassroom } from "./helpers";

// Asia: links opened inside chat apps, the connection test on the join page.

const LINK = "https://teachingtime.app/join/abc123xyz";

test("N1: chat-app browsers are recognised, with a way out where the app allows one", () => {
  const wechat = detectInAppBrowser(
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/116.0 Mobile Safari/537.36 MicroMessenger/8.0.47",
    LINK,
  );
  expect(wechat).toEqual({ app: "WeChat", os: "android", openUrl: null }); // WeChat blocks intent links
  const line = detectInAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari Line/13.20.0", LINK);
  expect(line?.app).toBe("LINE");
  expect(line?.openUrl).toBe(`${LINK}?openExternalBrowser=1`);
  const fb = detectInAppBrowser("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile [FB_IAB/FB4A;FBAV/450.0]", LINK);
  expect(fb?.openUrl).toMatch(/^intent:\/\/teachingtime\.app\/join\/abc123xyz#Intent;scheme=https;/);
  expect(detectInAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1", LINK)).toBeNull();

  expect(verdictOf({ rttMs: 120, lossPct: 0, upMbps: 2 })).toBe("good");
  expect(verdictOf({ rttMs: 380, lossPct: 3, upMbps: 0.5 })).toBe("ok");
  expect(verdictOf({ rttMs: 700, lossPct: 12, upMbps: 0.1 })).toBe("weak");
  expect(verdictOf(null)).toBe("blocked");
});

test("N1: the join page warns inside WeChat and tests the connection", async ({ page, browser }) => {
  test.setTimeout(150_000);
  await logIn(page);
  await openTestClassroom(page);
  const joinPath = new URL(`http://${await page.getByRole("textbox", { name: /'s link$/ }).inputValue()}`).pathname;

  const wechat = await browser.newContext({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.47 NetType/WIFI",
    viewport: { width: 390, height: 844 },
  });
  const s = await wechat.newPage();
  await s.goto(joinPath);
  const notice = s.getByTestId("in-app-notice");
  await expect(notice).toContainText("You opened this link inside WeChat");
  await expect(notice).toContainText("“Open in Safari”");
  await expect(notice.getByRole("button", { name: "Copy the link" })).toBeVisible();
  await wechat.close();

  // A normal browser: no notice; the connection test gives a verdict and reports it.
  const normal = await browser.newContext();
  const p = await normal.newPage();
  await p.goto(joinPath);
  await expect(p.getByTestId("in-app-notice")).toHaveCount(0);
  const report = p.waitForRequest((r) => r.url().endsWith("/api/report-error") && r.postData()!.includes("connection-test"), { timeout: 90_000 });
  await p.getByRole("button", { name: "Test my connection" }).click();
  await expect(p.getByTestId("connection-test")).toHaveAttribute("data-result", "running");
  await expect(p.getByTestId("connection-test")).toHaveAttribute("data-result", /good|ok|weak/, { timeout: 90_000 });
  expect(JSON.parse((await report).postData()!).message).toMatch(/^(good|ok|weak) (udp|tcp) rtt=\d+ms/);
  await normal.close();
});

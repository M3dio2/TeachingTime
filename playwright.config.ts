import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// The test teacher's login (E2E_TEACHER_EMAIL / E2E_TEACHER_PASSWORD) comes from .env.local.
loadEnvConfig(process.cwd());

// Browser tests against the dev server (`npm run test:e2e`). They log in as the test teacher
// and only ever use that account's classroom and lesson titled "Test" (see AGENTS.md).
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  workers: 1, // one shared test account, so tests run one after another
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Fake camera and mic, allowed without a prompt, for call tests.
    // Screen sharing: Chromium picks a source by itself (L1 screen-share test).
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        "--auto-select-desktop-capture-source=Entire screen",
        "--auto-accept-this-tab-capture",
      ],
    },
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  // Uses the running dev server; starts one only if none is running.
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true },
});

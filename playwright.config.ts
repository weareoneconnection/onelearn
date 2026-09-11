import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the production build in in-memory storage mode
// (see scripts/e2e-server.mjs). Build first with `npm run build:vercel`.
const port = Number(process.env.E2E_PORT ?? 3310);

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://127.0.0.1:${port}`, trace: "retain-on-failure", locale: "zh-CN" },
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: `http://127.0.0.1:${port}/terms`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { E2E_PORT: String(port) },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});

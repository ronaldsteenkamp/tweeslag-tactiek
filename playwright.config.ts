import { defineConfig, devices } from "@playwright/test";

const port = 4173;
/** Zet LIVE_URL om de tests tegen een online versie te draaien. */
const liveUrl = process.env.LIVE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: liveUrl ?? `http://localhost:${port}/tweeslag-tactiek/`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobiel", use: { ...devices["Pixel 7"] } },
  ],
  webServer: liveUrl
    ? undefined
    : {
        command: `npm run build && npm run preview -- --port ${port} --strictPort`,
        port,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

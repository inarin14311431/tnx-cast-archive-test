import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      // Native select text can vary slightly between otherwise identical
      // Chromium processes. Keep a small anti-aliasing allowance while still
      // failing on visible layout, spacing, color, and component changes.
      maxDiffPixelRatio: 0.006,
      stylePath: path.join(root, "tests/visual/stabilize.css")
    }
  },
  retries: 0,
  updateSnapshots: process.env.CI ? "none" : "missing",
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}",
  reporter: process.env.CI
    ? [["line"], ["html", { outputFolder: "playwright-report-visual", open: "never" }]]
    : [["list"], ["html", { outputFolder: "playwright-report-visual", open: "never" }]],
  outputDir: "test-results/visual",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    colorScheme: "dark",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off"
  },
  webServer: {
    command: "node tests/e2e/server.mjs",
    url: "http://127.0.0.1:4173/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000
  },
  projects: [
    {
      name: "visual-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 1
      }
    },
    {
      name: "visual-mobile",
      use: {
        ...devices["iPhone 13"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1
      }
    }
  ]
});

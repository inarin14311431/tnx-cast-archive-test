import { test, expect } from "@playwright/test";
import { installVisualEnvironment, settleVisualPage } from "./visual-fixtures.js";

const THEMES = [
  "nova", "moon", "star", "eden", "vlad", "lutetia", "buena", "canberra", "hongkong",
  "fesler", "intron", "axleraters", "inagaki", "astral", "orbital", "spectrum-neon",
  "japanese-army", "statistics-bureau"
];

for (const theme of THEMES) {
  test(`テーマ見本 ${theme}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "visual-desktop", "全テーマ見本はデスクトップで代表検査");
    await installVisualEnvironment(page, { theme });
    await page.goto("/index.html");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator(".cast-card")).toHaveCount(3);
    await settleVisualPage(page);
    await expect(page).toHaveScreenshot(`theme-${theme}.png`, { fullPage:false });
  });
}

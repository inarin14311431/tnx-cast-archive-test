import { test, expect } from "@playwright/test";
import { settleVisualPage } from "./visual-fixtures.js";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes } from "./act-showcase-fixtures.js";

for (const theme of ACT_THEMES) {
  test(`アクト紹介(スタンダード) ${theme}`, async ({ page }, testInfo) => {
    await installActShowcaseRoutes(page);
    await page.goto(`/act-showcase-standard.html?id=${ACT_SLUG}&theme=${theme}`);
    await expect(page.locator("html")).toHaveAttribute("data-showcase-theme", theme);
    await expect(page.locator("#act-showcase-standard-root")).toBeVisible();
    await expect(page.locator("#showcase-casts > *")).toHaveCount(3, { timeout: 10_000 });
    await settleVisualPage(page);
    await expect(page).toHaveScreenshot(`act-showcase-standard-${theme}-${testInfo.project.name}.png`, { fullPage: true });
  });
}

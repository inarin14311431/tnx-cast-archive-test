import { test, expect } from "@playwright/test";
import {
  VISUAL_CAST_ID,
  installVisualEnvironment,
  settleVisualPage
} from "./visual-fixtures.js";

const THEMES = ["nova", "spectrum-neon"];

async function capture(page, name) {
  await settleVisualPage(page);
  const legalFooter = page.locator("[data-legal-footer]");
  if (await legalFooter.count()) {
    await legalFooter.evaluate(element => { element.style.visibility = "hidden"; });
  }
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage:false });
}

for (const theme of THEMES) {
  test(`アカウント ${theme}`, async ({ page }, testInfo) => {
    await installVisualEnvironment(page, { authenticated:true, theme });
    await page.goto("/account.html");
    await expect(page.locator("#owned-casts .owned-cast")).toHaveCount(1);
    await capture(page, `account-${theme}-${testInfo.project.name}`);
  });

  test(`アクト管理・経験点履歴 ${theme}`, async ({ page }, testInfo) => {
    await installVisualEnvironment(page, { authenticated:true, theme });
    await page.goto(`/acts.html?character=${VISUAL_CAST_ID}`);
    await expect(page.locator("#act-history-list")).toBeVisible();
    await expect(page.locator("#experience-spending-list")).toBeVisible();
    await capture(page, `acts-${theme}-${testInfo.project.name}`);
  });

  test(`アクト紹介生成 ${theme}`, async ({ page }, testInfo) => {
    await installVisualEnvironment(page, { authenticated:true, theme });
    await page.goto("/showcase-generator.html");
    await expect(page.locator("#public-cast-grid")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-showcase-generator-state", "ready");
    await capture(page, `showcase-generator-${theme}-${testInfo.project.name}`);
  });

  test(`モバイル編集 ${theme}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "visual-mobile", "モバイル編集の基準画像はモバイル専用");
    await installVisualEnvironment(page, { authenticated:true, theme });
    await page.goto(`/sheet-mobile.html?id=${VISUAL_CAST_ID}`);
    await expect(page.locator("#mobile-profile")).toBeVisible();
    await expect(page.getByRole("button", { name:/基本情報/ }).first()).toBeVisible();
    await expect(page.locator('[data-mobile-character-field="character_name"]')).toHaveValue("夜明けのランナー");
    await capture(page, `sheet-mobile-${theme}-${testInfo.project.name}`);
  });
}

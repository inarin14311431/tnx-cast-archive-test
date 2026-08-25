import { test, expect } from "@playwright/test";
import {
  VISUAL_CAST_ID,
  VISUAL_TROOP_ID,
  installVisualEnvironment,
  settleVisualPage
} from "./visual-fixtures.js";

const THEMES = ["nova", "spectrum-neon"];

async function capture(page, name) {
  await settleVisualPage(page);
  const legalFooter = page.locator("[data-legal-footer]");
  await expect(legalFooter).toHaveCount(1);
  await expect(legalFooter).toBeVisible();
  await legalFooter.evaluate(element => { element.style.visibility = "hidden"; });
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage:false });
}

for (const theme of THEMES) {
  test(`ログイン画面 ${theme}`, async ({ page }, testInfo) => {
    await installVisualEnvironment(page, { theme });
    await page.goto("/login.html");
    await capture(page, `login-${theme}-${testInfo.project.name}`);
  });

  test(`キャスト一覧 ${theme}`, async ({ page }, testInfo) => {
    await installVisualEnvironment(page, { theme });
    await page.goto("/index.html");
    await expect(page.locator(".cast-card")).toHaveCount(3);
    await capture(page, `archive-${theme}-${testInfo.project.name}`);
  });

  test(`キャスト閲覧 ${theme}`, async ({ page }, testInfo) => {
    await installVisualEnvironment(page, { theme });
    const mobile = testInfo.project.name === "visual-mobile" ? "1" : "0";
    await page.goto(`/cast.html?id=${VISUAL_CAST_ID}&mobile=${mobile}`);
    if (mobile === "1") await expect(page.locator("#mobile-cast-view .mobile-cast-main")).toBeVisible();
    else await expect(page.locator("#cast-content")).toBeVisible();
    await capture(page, `cast-${theme}-${testInfo.project.name}`);
  });

  test(`トループ管理 ${theme}`, async ({ page }, testInfo) => {
    await installVisualEnvironment(page, { authenticated:true, theme });
    await page.goto("/troops.html");
    await expect(page.locator(".troop-card")).toHaveCount(1);
    await capture(page, `troops-${theme}-${testInfo.project.name}`);
  });

  test(`トループ閲覧 ${theme}`, async ({ page }, testInfo) => {
    await installVisualEnvironment(page, { theme });
    await page.goto(`/troop.html?id=${VISUAL_TROOP_ID}`);
    await expect(page.locator("#troop-view")).toBeVisible();
    await capture(page, `troop-${theme}-${testInfo.project.name}`);
  });

  test(`PC編集画面 ${theme}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "visual-desktop", "PC編集画面の基準画像はデスクトップ専用");
    await installVisualEnvironment(page, { authenticated:true, theme });
    await page.goto("/sheet.html");
    await expect(page.locator("#save-button")).toBeVisible();
    await expect(page.locator("#character-name")).toBeVisible();
    await capture(page, `sheet-${theme}-${testInfo.project.name}`);
  });
}

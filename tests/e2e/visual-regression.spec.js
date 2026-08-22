import { test, expect } from "@playwright/test";
import {
  getTestCastId,
  hasAuthCredentials,
  waitForCastReady
} from "./helpers.js";

const THEMES = [
  "nova",
  "intron",
  "orbital"
];

async function setTheme(page, theme) {
  await page.evaluate((value) => {
    localStorage.setItem("tnx-cast-site-theme", value);
    document.documentElement.dataset.theme = value;
    document.documentElement.style.colorScheme = ["intron", "orbital"].includes(value)
      ? "light"
      : "dark";
  }, theme);
}

async function disableMotion(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition: none !important;
        caret-color: transparent !important;
      }

      .scanlines,
      .background-grid {
        animation: none !important;
      }
    `
  });
}

for (const theme of THEMES) {
  test(`公開キャスト主要表示を画像比較できる: ${theme}`, async ({ page }) => {
    test.skip(
      !hasAuthCredentials(),
      "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ"
    );

    await page.goto(`/cast.html?id=${getTestCastId()}`);
    await waitForCastReady(page);
    await setTheme(page, theme);
    await disableMotion(page);

    await expect(page).toHaveScreenshot(`cast-${theme}.png`, {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01
    });
  });
}

test("アカウント画面の主要操作を画像比較できる", async ({ page }) => {
  test.skip(
    !hasAuthCredentials(),
    "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ"
  );

  await page.goto("/account.html");
  await page.locator(".account-layout").waitFor({ state: "visible" });
  await disableMotion(page);

  await expect(page.locator(".account-layout")).toHaveScreenshot(
    "account-main.png",
    {
      animations: "disabled",
      maxDiffPixelRatio: 0.01
    }
  );
});

test("PC編集画面の主要セクションを画像比較できる", async ({ page }) => {
  test.skip(
    !hasAuthCredentials(),
    "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ"
  );

  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await page.locator("main").waitFor({ state: "visible" });
  await disableMotion(page);

  await expect(page.locator("main")).toHaveScreenshot("sheet-main.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.01
  });
});

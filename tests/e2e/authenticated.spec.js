import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady, watchPageErrors, watchStaticAssetErrors } from "./helpers.js";

test("保存済みログイン状態を再利用できる", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  await page.goto("/account.html");
  await expect(page).not.toHaveURL(/login\.html/);
  await expect(page.locator("body")).toContainText(/ACCOUNT|アカウント/i);
  await expect(page.locator("#account-email")).not.toHaveText(/読み込み中/);
});

test("アカウント画面からアクト紹介生成を開いて初期化できる", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  const assertNoErrors = watchPageErrors(page);
  const assertNoAssetErrors = watchStaticAssetErrors(page);

  await page.goto("/account.html");
  await expect(page).not.toHaveURL(/login\.html/);
  await page.locator('.account-action[href="./showcase-generator.html"]').click();

  await expect(page).toHaveURL(/showcase-generator\.html/);
  await expect(page.locator("#generate-button")).toBeVisible();
  await expect(page.locator("#public-cast-grid")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-showcase-generator-state", "ready", { timeout: 10000 });
  await expect(page.locator("#library-status")).not.toContainText("キャスト選択エラー");

  assertNoErrors();
  assertNoAssetErrors();
});

test("編集画面のエクスポートモジュールは循環せず一度だけ初期化される", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  const assertNoErrors = watchPageErrors(page);
  const assertNoAssetErrors = watchStaticAssetErrors(page);

  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);

  await expect(page.locator("#cocofolia-copy-button")).toBeVisible();
  await expect(page.locator("#udonarium-export-button")).toBeVisible();
  await expect(page.locator("script#tnx-cocofolia-export-module")).toHaveCount(1);
  await expect(page.locator("script#tnx-udonarium-export-module")).toHaveCount(1);

  assertNoErrors();
  assertNoAssetErrors();
});

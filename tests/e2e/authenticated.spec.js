import { test, expect } from "@playwright/test";
import { hasAuthCredentials } from "./helpers.js";

test("保存済みログイン状態を再利用できる", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  await page.goto("/account.html");
  await expect(page).not.toHaveURL(/login\.html/);
  await expect(page.locator("body")).toContainText(/ACCOUNT|アカウント/i);
  await expect(page.locator("#account-email")).not.toHaveText(/読み込み中/);
});

import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForCastReady, watchPageErrors, watchStaticAssetErrors } from "./helpers.js";

test("テストキャストの閲覧画面を正常に表示できる", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  const assertNoErrors = watchPageErrors(page);
  const assertNoAssetErrors = watchStaticAssetErrors(page);
  await page.goto(`/cast.html?id=${getTestCastId()}`);
  await waitForCastReady(page);
  await expect(page.locator("body")).not.toContainText("指定されたキャストは存在しません");
  assertNoErrors();
  assertNoAssetErrors();
});

test("閲覧画面に意図しない横スクロールがない", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  await page.goto(`/cast.html?id=${getTestCastId()}`);
  await waitForCastReady(page);
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client + 2);
});

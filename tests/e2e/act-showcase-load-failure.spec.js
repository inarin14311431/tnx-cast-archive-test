import { test, expect } from "@playwright/test";
import { ACT_SLUG, installActShowcaseRoutes } from "./fixtures/act-showcase-data.js";

// docs/ACT_SHOWCASE_SCENES.md section 6.2: a visitor never stays on the loading screen for good. A module that does not load is shown as
// an error with a reload link; data that does not answer is noted after 6 s on the loading screen and given up after 15 s.
const url = `/act-showcase.html?id=${ACT_SLUG}&theme=nova`;

test("a module that does not load: the failure is shown with a reload link, and the loading screen is gone", async ({ page }) => {
  await installActShowcaseRoutes(page);
  await page.route("**/js/act-showcase-finale-enhancer.js*", route => route.fulfill({ status: 500, contentType: "text/plain", body: "broken" }));
  await page.goto(url);
  const status = page.locator("#act-showcase-status");
  await expect(status).toBeVisible({ timeout: 10_000 });
  await expect(status).toHaveClass(/is-error/);
  await expect(status).toContainText("ページの読み込みに失敗しました");
  const reload = status.locator("a");
  await expect(reload).toHaveText("再読み込み");
  await expect(reload).toHaveAttribute("href", new RegExp(`${ACT_SLUG}`));
  await expect(page.locator("#cinematic-intro")).toHaveCount(0, { timeout: 5_000 });
});

test("data that never answers: the loading screen says so after 6 s, and the failure is shown after 15 s", async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.install();
  await installActShowcaseRoutes(page);
  // the showcase request is never answered (the guest request is, so only the showcase decides)
  await page.route("**/rest/v1/rpc/get_public_act_showcase", () => {});
  await page.goto(url);
  const intro = page.locator("#cinematic-intro");
  await expect(intro).toBeVisible();
  await expect(page.locator(".cinematic-intro__slow")).toHaveCount(0);
  await page.clock.fastForward(6_500);
  const note = page.locator(".cinematic-intro__slow");
  await expect(note).toBeVisible();
  await expect(note).toContainText("読み込みに時間がかかっています");
  await expect(note.locator("a")).toHaveText("再読み込み");
  // not yet an error: the request still has until 15 s
  await expect(page.locator("#act-showcase-status.is-error")).toHaveCount(0);
  await page.clock.fastForward(9_000);
  const status = page.locator("#act-showcase-status");
  await expect(status).toHaveClass(/is-error/, { timeout: 10_000 });
  await expect(status).toContainText("公開データの取得に時間がかかりすぎました");
  await expect(status.locator("a")).toHaveText("再読み込み");
  await expect(intro).toHaveCount(0, { timeout: 5_000 });
});

test("a normal load shows no note and no error", async ({ page }) => {
  test.setTimeout(60_000);
  await installActShowcaseRoutes(page);
  await page.goto(url);
  await expect(page.locator(".neotokyo-sequence__stage")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(6_500);
  await expect(page.locator(".cinematic-intro__slow")).toHaveCount(0);
  await expect(page.locator("#act-showcase-status.is-error")).toHaveCount(0);
});

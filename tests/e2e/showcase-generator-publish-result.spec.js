import { test, expect } from "@playwright/test";
import { installShowcaseGeneratorMock, MOCK_PUBLIC_CASTS } from "./fixtures/showcase-generator-mock.mjs";

// The card that replaces the one-line "published" message (js/showcase-publish-result.js), with the real modules and a fake Supabase.

async function openGenerator(page, options = {}) {
  await page.route("**/*", route => {
    const { hostname } = new URL(route.request().url());
    return hostname === "127.0.0.1" || hostname === "localhost" ? route.fallback() : route.abort();
  });
  const calls = await installShowcaseGeneratorMock(page, {
    ...options,
    rpc: { publish_act_showcase_for_current_user: "act-mock-id", replace_act_showcase_guests_for_current_user: null, ...options.rpc }
  });
  await page.goto("/showcase-generator.html");
  await expect(page.locator("html")).toHaveAttribute("data-showcase-generator-state", "ready", { timeout: 15_000 });
  await expect(page.locator("#public-cast-grid [data-public-character-id]").first()).toBeVisible();
  return calls;
}

async function fillAct(page, { slug = "result-test", title = "公開結果テスト", subtitle = "" } = {}) {
  await page.locator("#act-name").fill(title);
  await page.locator("#section-act .showcase-advanced > summary").click();
  await page.locator("#publish-slug").fill(slug);
  if (subtitle) await page.locator("#act-subtitle").fill(subtitle);
  await page.locator(`[data-public-character-id="${MOCK_PUBLIC_CASTS[0].id}"]`).click();
  await page.locator('#selected-casts [data-selected-index="0"] [data-action="toggle"]').click();
  await page.locator('[data-selected-index="0"] [data-field="quote"]').selectOption("カタナ");
}

async function publish(page, mode) {
  await page.locator(`#publish-${mode}-button`).click();
  await expect(page.locator("#publish-result")).toBeVisible({ timeout: 20_000 });
}

test("a successful publication shows the result card with the URL, the links and the X post", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await openGenerator(page);
  await expect(page.locator("#publish-result")).toBeHidden();
  await fillAct(page, { slug: "result-test", title: "ネオンの残像&夜", subtitle: "夜明け前" });
  await publish(page, "cinematic");

  const card = page.locator("#publish-result");
  await expect(card).toContainText("✓ 公開しました");
  await expect(card).toContainText("PUBLISHED");
  await expect(card).toContainText("豪華版で公開");
  // the old one-line message is gone
  await expect(page.locator("#generator-status")).not.toContainText("公開処理が完了しました");

  const base = new URL(page.url()).origin;
  const cinematicUrl = `${base}/act-showcase.html?id=result-test&theme=nova`;
  const standardUrl = `${base}/act-showcase-standard.html?id=result-test&theme=nova`;
  await expect(card.locator("#publish-result-url")).toHaveValue(cinematicUrl);
  await expect(card.locator("#publish-result-url")).toHaveAttribute("readonly", "");

  const open = card.locator("[data-result-open]");
  await expect(open.nth(0)).toHaveText("公開ページを開く");
  await expect(open.nth(0)).toHaveAttribute("href", cinematicUrl);
  await expect(open.nth(0)).toHaveAttribute("target", "_blank");
  await expect(open.nth(1)).toHaveText("スタンダード版を開く");
  await expect(open.nth(1)).toHaveAttribute("href", standardUrl);

  const share = card.locator("[data-result-share]");
  await expect(share).toHaveText("X に投稿");
  await expect(share).toHaveAttribute("target", "_blank");
  const shareUrl = new URL(await share.getAttribute("href"));
  expect(`${shareUrl.origin}${shareUrl.pathname}`).toBe("https://x.com/intent/post");
  expect(shareUrl.searchParams.get("url")).toBe(cinematicUrl);
  const text = shareUrl.searchParams.get("text");
  expect(text).toContain("『ネオンの残像&夜 ― 夜明け前』のアクト紹介を公開しました");
  expect(text).toContain("#トーキョーNOVA");

  const copy = card.locator("[data-result-copy]");
  await copy.click();
  await expect(copy).toHaveText("コピーしました");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(cinematicUrl);
  await expect(copy).toHaveText("コピー", { timeout: 5_000 });
  expect(errors).toEqual([]);
});

test("the standard version puts its own page first and the cinematic page second", async ({ page }) => {
  await openGenerator(page);
  await fillAct(page, { slug: "result-standard" });
  await publish(page, "standard");
  const card = page.locator("#publish-result");
  const base = new URL(page.url()).origin;
  await expect(card).toContainText("スタンダード版で公開");
  await expect(card.locator("[data-result-open]").nth(0)).toHaveAttribute("href", `${base}/act-showcase-standard.html?id=result-standard&theme=nova`);
  await expect(card.locator("[data-result-open]").nth(1)).toHaveText("豪華版を開く");
  await expect(card.locator("[data-result-open]").nth(1)).toHaveAttribute("href", `${base}/act-showcase.html?id=result-standard&theme=nova`);
  expect(new URL(await card.locator("[data-result-share]").getAttribute("href")).searchParams.get("url")).toBe(`${base}/act-showcase-standard.html?id=result-standard&theme=nova`);
  // no subtitle: only the title in the post
  expect(new URL(await card.locator("[data-result-share]").getAttribute("href")).searchParams.get("text")).toContain("『公開結果テスト』のアクト紹介を公開しました");
});

test("the card stays through edits, closes with the × button and is drawn again by the next publication", async ({ page }) => {
  await openGenerator(page);
  await fillAct(page, { slug: "result-keep" });
  await publish(page, "cinematic");
  await page.locator("#act-name").fill("入力を変えても消えない");
  await expect(page.locator("#publish-result")).toBeVisible();
  const close = page.locator("#publish-result [data-result-close]");
  await expect(close).toHaveAttribute("aria-label", "公開結果を閉じる");
  await close.click();
  await expect(page.locator("#publish-result")).toBeHidden();
  await publish(page, "cinematic");
  await expect(page.locator("#publish-result [data-result-share]")).toHaveAttribute("href", /%E5%85%A5%E5%8A%9B%E3%82%92%E5%A4%89%E3%81%88%E3%81%A6%E3%82%82%E6%B6%88%E3%81%88%E3%81%AA%E3%81%84/);
});

test("a published act turns the publish button of that version into 更新して再公開", async ({ page }) => {
  await openGenerator(page);
  await fillAct(page, { slug: "result-again" });
  await expect(page.locator("#publish-cinematic-button")).toContainText("豪華版で公開");
  await publish(page, "cinematic");
  await expect(page.locator("#publish-cinematic-button")).toContainText("更新して再公開");
  await expect(page.locator("#publish-cinematic-button")).toContainText("CINEMATIC SHOWCASE");
  await expect(page.locator("#publish-standard-button")).toContainText("スタンダード版で公開");
  // another identifier is a new act
  await page.locator("#publish-slug").fill("result-other");
  await expect(page.locator("#publish-cinematic-button")).toContainText("豪華版で公開");
  await page.locator("#publish-slug").fill("result-again");
  await expect(page.locator("#publish-cinematic-button")).toContainText("更新して再公開");
  // the republication works the same as the publication
  await page.locator("#publish-cinematic-button").click();
  await expect(page.locator("#publish-result")).toBeVisible();
});

test("an act loaded for editing reads as published in both versions", async ({ page }) => {
  await openGenerator(page);
  await page.locator("#section-act .showcase-advanced > summary").click();
  await page.locator("#publish-slug").fill("loaded-act");
  await page.evaluate(() => document.dispatchEvent(new CustomEvent("tnx:showcase-restored", { detail: { slug: "loaded-act" } })));
  await expect(page.locator("#publish-cinematic-button")).toContainText("更新して再公開");
  await expect(page.locator("#publish-standard-button")).toContainText("更新して再公開");
});

test("a failed publication shows the error in the publish column and no card", async ({ page }) => {
  await openGenerator(page, { rpcFailures: { publish_act_showcase_for_current_user: "boom" } });
  await fillAct(page, { slug: "result-fail" });
  await page.locator("#publish-cinematic-button").click();
  await expect(page.locator("#generator-status")).toHaveClass(/is-error/, { timeout: 20_000 });
  await expect(page.locator("#publish-result")).toBeHidden();
  await expect(page.locator("#publish-cinematic-button")).toContainText("豪華版で公開");
});

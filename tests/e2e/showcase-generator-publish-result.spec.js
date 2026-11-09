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

test("a published act turns the publish button of that version into 「<版>を更新して再公開」", async ({ page }) => {
  await openGenerator(page);
  await fillAct(page, { slug: "result-again" });
  await expect(page.locator("#publish-cinematic-button")).toContainText("豪華版で公開");
  await publish(page, "cinematic");
  await expect(page.locator("#publish-cinematic-button")).toContainText("豪華版を更新して再公開");
  await expect(page.locator("#publish-cinematic-button")).toContainText("CINEMATIC SHOWCASE");
  await expect(page.locator("#publish-standard-button")).toContainText("スタンダード版で公開");
  // another identifier is a new act
  await page.locator("#publish-slug").fill("result-other");
  await expect(page.locator("#publish-cinematic-button")).toContainText("豪華版で公開");
  await page.locator("#publish-slug").fill("result-again");
  await expect(page.locator("#publish-cinematic-button")).toContainText("豪華版を更新して再公開");
  // the republication works the same as the publication
  await page.locator("#publish-cinematic-button").click();
  await expect(page.locator("#publish-result")).toBeVisible();
});

test("an act loaded for editing reads as published in both versions", async ({ page }) => {
  await openGenerator(page);
  await page.locator("#section-act .showcase-advanced > summary").click();
  await page.locator("#publish-slug").fill("loaded-act");
  await page.evaluate(() => document.dispatchEvent(new CustomEvent("tnx:showcase-restored", { detail: { slug: "loaded-act" } })));
  await expect(page.locator("#publish-cinematic-button")).toContainText("豪華版を更新して再公開");
  await expect(page.locator("#publish-standard-button")).toContainText("スタンダード版を更新して再公開");
});

test("a failed publication shows the error in the publish column and no card", async ({ page }) => {
  await openGenerator(page, { rpcFailures: { publish_act_showcase_for_current_user: "boom" } });
  await fillAct(page, { slug: "result-fail" });
  await page.locator("#publish-cinematic-button").click();
  await expect(page.locator("#generator-status")).toHaveClass(/is-error/, { timeout: 20_000 });
  await expect(page.locator("#publish-result")).toBeHidden();
  await expect(page.locator("#publish-cinematic-button")).toContainText("豪華版で公開");
});

// ---- the poster panel of the card (js/showcase-poster-panel.js, docs/ACT_POSTER_SPEC.md) ----------------------------------------------------
async function openPoster(page, options = {}) {
  const calls = await openGenerator(page, options);
  await fillAct(page, { slug: "poster-act", title: "ポスターの試験", subtitle: "副題です" });
  await page.locator("#ruler-name").fill("試験RL");
  await page.locator("#scenario-writer-name").fill("試験ライター");
  await page.locator("#intro-text").fill("最初の行\n\nここが最後の行です。\n");
  await publish(page, "cinematic");
  await page.locator("[data-poster-toggle]").click();
  return calls;
}
const ready = page => expect(page.locator("#poster-preview")).toHaveAttribute("data-state", "ready", { timeout: 30_000 });

test("the poster panel opens, draws the poster and offers the inputs with their first values", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await openPoster(page);
  const toggle = page.locator("[data-poster-toggle]");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toContainText("投稿用画像を作る");
  await expect(page.locator("[data-poster-panel]")).toBeVisible();
  await expect(page.locator("#poster-date")).toHaveValue("");
  await expect(page.locator("#poster-date")).toHaveAttribute("maxlength", "24");
  await expect(page.locator("#poster-catch")).toHaveValue("ここが最後の行です。");
  await expect(page.locator("#poster-catch")).toHaveAttribute("maxlength", "40");
  await ready(page);
  const canvas = page.locator("#poster-preview");
  expect(await canvas.evaluate(node => [node.width, node.height])).toEqual([2400, 1350]);
  // something was drawn: not an empty (transparent) or single-colour picture
  const drawn = await canvas.evaluate(node => {
    const data = node.getContext("2d").getImageData(0, 0, node.width, node.height, { colorSpace: "srgb" }).data;
    const first = [data[0], data[1], data[2], data[3]];
    let different = 0;
    for (let index = 0; index < data.length; index += 4 * 97) if (data[index] !== first[0] || data[index + 1] !== first[1] || data[index + 2] !== first[2]) different += 1;
    return { alpha: first[3], different, total: data.length / (4 * 97) };
  });
  expect(drawn.alpha).toBe(255);
  expect(drawn.different / drawn.total).toBeGreaterThan(0.05);
  await expect(page.locator("[data-poster-status]")).toHaveText("画像を生成しました");
  // the alt text, readable and copyable
  const alt = page.locator("#poster-alt");
  await expect(alt).toHaveAttribute("readonly", "");
  await expect(alt).toHaveValue(/アクト名「ポスターの試験」、副題です。/);
  await expect(alt).toHaveValue(/RL: 試験RL/);
  await expect(alt).toHaveValue(/ライター: 試験ライター/);
  await expect(alt).toHaveValue(/HO1 カタナ /);
  await expect(alt).toHaveValue(/キャッチコピー: ここが最後の行です。/);
  await expect(alt).toHaveValue(/日付: 近日開演/);
  await expect(page.locator("[data-poster-alt-copy]")).toBeVisible();
  // the toggle closes it again
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("[data-poster-panel]")).toBeHidden();
  expect(errors).toEqual([]);
});

test("a typed date and catch line redraw the poster (debounced), are limited in length and remembered for the tab, not saved", async ({ page, context }) => {
  const calls = await openPoster(page);
  await ready(page);
  const alt = page.locator("#poster-alt");
  await page.locator("#poster-date").fill("11.23 SUN 21:00〜");
  await page.locator("#poster-catch").fill("新しい一言");
  await expect(alt).toHaveValue(/キャッチコピー: 新しい一言/);
  await expect(alt).toHaveValue(/日付: 11.23 SUN 21:00〜/);
  await ready(page);
  // typing past the limit is stopped by the field (24 / 40 characters)
  await page.locator("#poster-date").fill("");
  await page.locator("#poster-date").pressSequentially("9".repeat(30));
  await expect(page.locator("#poster-date")).toHaveValue("9".repeat(24));
  // an emptied catch line means no catch line (not the first value again)
  await page.locator("#poster-catch").fill("");
  await expect(alt).not.toHaveValue(/キャッチコピー/);
  await ready(page);
  const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem("tnx-act-poster-inputs:poster-act")));
  expect(stored).toEqual({ date: "9".repeat(24), catchCopy: "" });
  expect(await page.evaluate(() => localStorage.length)).toBeLessThanOrEqual(2); // nothing of it in the long-lived storage (the mock's own session keys only)
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.includes("poster")))).toEqual([]);
  // the database is not touched: no call carries the inputs
  expect(JSON.stringify(calls.rpcCalls)).not.toContain("9".repeat(24));
  // publishing again (same act): the panel comes back with what was typed
  await page.locator("#publish-result [data-result-close]").click();
  await publish(page, "cinematic");
  await page.locator("[data-poster-toggle]").click();
  await expect(page.locator("#poster-date")).toHaveValue("9".repeat(24));
  await expect(page.locator("#poster-catch")).toHaveValue("");
  await ready(page);
});

test("saving downloads a PNG named after the act", async ({ page }) => {
  await openPoster(page);
  await ready(page);
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("[data-poster-save]").click()]);
  expect(download.suggestedFilename()).toBe("act-poster-poster-act.png");
  const { readFile } = await import("node:fs/promises");
  const bytes = await readFile(await download.path());
  expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect(bytes.length).toBeGreaterThan(20_000);
  await expect(page.locator("[data-poster-status]")).toHaveText("画像を保存しました");
});

test("copy puts a PNG on the clipboard and share hands the file, the post text and the public URL to the share sheet (APIs mocked)", async ({ page }) => {
  await page.addInitScript(() => {
    window.__copied = null;
    window.__shared = null;
    navigator.clipboard.write = async items => {
      const blob = await items[0].getType("image/png");
      window.__copied = { types: [...items[0].types], type: blob.type, size: blob.size };
    };
    navigator.canShare = data => Boolean(data?.files?.length);
    navigator.share = async data => {
      window.__shared = { files: data.files.map(file => ({ name: file.name, type: file.type, size: file.size })), text: data.text, url: data.url };
    };
  });
  await openPoster(page);
  await ready(page);
  await page.locator("[data-poster-copy]").click();
  await expect(page.locator("[data-poster-status]")).toHaveText("画像をコピーしました");
  const copied = await page.evaluate(() => window.__copied);
  expect(copied.types).toEqual(["image/png"]);
  expect(copied.type).toBe("image/png");
  expect(copied.size).toBeGreaterThan(20_000);

  const share = page.locator("[data-poster-share]");
  await expect(share).toBeVisible();
  await share.click();
  await expect(page.locator("[data-poster-status]")).toHaveText("共有しました");
  const shared = await page.evaluate(() => window.__shared);
  expect(shared.files).toHaveLength(1);
  expect(shared.files[0]).toMatchObject({ name: "act-poster-poster-act.png", type: "image/png" });
  expect(shared.files[0].size).toBeGreaterThan(20_000);
  expect(shared.text).toContain("『ポスターの試験 ― 副題です』のアクト紹介を公開しました");
  expect(shared.text).toContain("RL: 試験RL / ライター: 試験ライター");
  expect(shared.text).toContain("HO1 カタナ ");
  expect(shared.text).toContain("#トーキョーNOVA");
  expect(shared.url).toBe(`${new URL(page.url()).origin}/act-showcase.html?id=poster-act&theme=nova`);
});

test("where the browser cannot copy an image or share a file, copy is disabled with a pointer to saving and share is not offered", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "ClipboardItem", { value: undefined, configurable: true });
    Object.defineProperty(Navigator.prototype, "canShare", { value: undefined, configurable: true });
  });
  await openPoster(page);
  await ready(page);
  await expect(page.locator("[data-poster-copy]")).toBeDisabled();
  await expect(page.locator("[data-poster-copy-hint]")).toBeVisible();
  await expect(page.locator("[data-poster-copy-hint]")).toContainText("画像を保存");
  await expect(page.locator("[data-poster-share]")).toBeHidden();
  await expect(page.locator("[data-poster-save]")).toBeEnabled();
});

test("the X link names who runs and who plays, and the poster works when the tab's storage cannot be used", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", { get() { throw new Error("denied"); }, configurable: true });
  });
  await openPoster(page);
  await ready(page);
  await page.locator("#poster-date").fill("1.1");
  await expect(page.locator("#poster-alt")).toHaveValue(/日付: 1.1/);
  await expect.poll(async () => new URL(await page.locator("[data-result-share]").getAttribute("href")).searchParams.get("text")).toContain("RL: 試験RL / ライター: 試験ライター");
  const post = new URL(await page.locator("[data-result-share]").getAttribute("href")).searchParams.get("text");
  expect(post).toContain("『ポスターの試験 ― 副題です』のアクト紹介を公開しました");
  expect(post).toMatch(/HO1 カタナ /);
  expect(post.endsWith("#トーキョーNOVA")).toBe(true);
  expect(errors).toEqual([]);
});

test("when the poster cannot be drawn the panel says so and the buttons stay off", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function patched(...args) {
      if (this.id === "poster-preview") throw new Error("no canvas");
      return original.apply(this, args);
    };
  });
  await openPoster(page);
  await expect(page.locator("#poster-preview")).toHaveAttribute("data-state", "error", { timeout: 30_000 });
  await expect(page.locator("[data-poster-status]")).toContainText("画像を生成できませんでした");
  await expect(page.locator("[data-poster-status]")).toHaveAttribute("data-state", "error");
  await expect(page.locator("[data-poster-save]")).toBeDisabled();
  await expect(page.locator("[data-poster-copy]")).toBeDisabled();
});

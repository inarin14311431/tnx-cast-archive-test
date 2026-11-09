import { test, expect } from "@playwright/test";
import { installShowcaseGeneratorMock, MOCK_PUBLIC_CASTS, MOCK_PRIVATE_CASTS } from "./fixtures/showcase-generator-mock.mjs";

// The generator's frame: header actions, the "published" band, the step navigation, the publish column and the export dialog.

// A row's handout panel (role, tagline, handout text) is closed until its "ハンドアウト" button is pressed.
async function openRow(page, index) {
  const panel = page.locator(`#selected-casts [data-selected-index="${index}"] .cast-row__panel`);
  if (await panel.isHidden()) await page.locator(`#selected-casts [data-selected-index="${index}"] [data-action="toggle"]`).click();
}

async function openGenerator(page, { query = "", ...options } = {}) {
  await page.route("**/*", route => {
    const { hostname } = new URL(route.request().url());
    return hostname === "127.0.0.1" || hostname === "localhost" ? route.fallback() : route.abort();
  });
  const calls = await installShowcaseGeneratorMock(page, {
    rpc: { publish_act_showcase_for_current_user: "act-mock-id", replace_act_showcase_guests_for_current_user: null, ...options.rpc },
    ...options
  });
  await page.goto(`/showcase-generator.html${query}`);
  await expect(page.locator("html")).toHaveAttribute("data-showcase-generator-state", "ready", { timeout: 15_000 });
  await expect(page.locator("#public-cast-grid [data-public-character-id]").first()).toBeVisible();
  return calls;
}

const pick = (page, index) => page.locator(`[data-public-character-id="${MOCK_PUBLIC_CASTS[index].id}"]`).click();
const stepStatus = (page, key) => page.locator(`[data-step-status="${key}"]`);

test("the header keeps the back link, the title and the actions; the published band opens on demand", async ({ page }) => {
  await openGenerator(page);
  await expect(page.locator(".showcase-header__back")).toHaveAttribute("href", "./account.html");
  await expect(page.locator(".showcase-header h1")).toContainText("アクト紹介生成");
  await expect(page.locator(".showcase-header__archive")).toHaveAttribute("href", "./index.html");
  const toggle = page.locator("#owned-showcase-toggle");
  const band = page.locator("#owned-showcase-restore");
  await expect(band).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(band).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#owned-showcase-select")).toBeVisible();
  await expect(page.locator("#owned-showcase-restore")).toContainText("取り下げても、アクト履歴と参加履歴は残ります");
  await expect(page.locator("#delete-owned-showcase")).toHaveText(/公開を取り下げる/);
  await toggle.click();
  await expect(band).toBeHidden();
});

test("the published band opens from the first moment the page is interactive", async ({ page }) => {
  await page.route("**/*", route => {
    const { hostname } = new URL(route.request().url());
    return hostname === "127.0.0.1" || hostname === "localhost" ? route.fallback() : route.abort();
  });
  await installShowcaseGeneratorMock(page, {});
  await page.goto("/showcase-generator.html", { waitUntil: "domcontentloaded" });
  // No wait for the generator modules: the toggle is wired by a module the loader imports statically.
  await page.locator("#owned-showcase-toggle").click();
  await expect(page.locator("#owned-showcase-restore")).toBeVisible();
  await expect(page.locator("#delete-owned-showcase")).toBeVisible({ timeout: 12_000 });
});

test("a link with ?edit= restores a published showcase through the band", async ({ page }) => {
  const saved = {
    slug: "shell-restore",
    actName: "復元されるアクト",
    rulerName: "復元RULER",
    showcaseData: {
      version: 2, pageTitle: "保存されたページタイトル", actName: "復元されるアクト", rulerName: "復元RULER",
      trailer: { title: "ACT TRAILER", body: "保存済みトレーラー" }, scenes: { title: "b" },
      casts: [{ serial: "PRIVATE", fullName: "復元用手動キャスト", styles: [{ label: "カブト◎", handoutRole: true }], meta: [], tagline: "“保存済みの一言”", handout: { title: "『カブト』用ハンドアウト", body: "保存済みハンドアウト" } }]
    },
    participants: []
  };
  await openGenerator(page, {
    query: `?edit=${saved.slug}`,
    ownedActs: [{ slug: saved.slug, act_name: saved.actName, ruler_name: saved.rulerName, showcase_public: true, showcase_updated_at: "2026-09-09T00:00:00Z", updated_at: "2026-09-09T00:00:00Z" }],
    rpc: { get_owned_act_showcase_editor: saved }
  });
  await expect(page.locator("#owned-showcase-restore")).toBeVisible();
  await expect(page.locator("#act-name")).toHaveValue("復元されるアクト", { timeout: 12_000 });
  // The saved page title is put back as it was saved, not rewritten.
  await expect(page.locator("#page-title")).toHaveValue("保存されたページタイトル");
  await expect(page.locator("#ruler-name")).toHaveValue("復元RULER");
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"title":"b"}');
  await expect(page.locator('#selected-casts [data-selected-index="0"] [data-field="manual-name"]')).toHaveValue("復元用手動キャスト");
  await expect(page.locator("#owned-showcase-status")).toContainText("アクト紹介を復元しました");
  await expect(stepStatus(page, "cast")).toHaveText("1人・HO 1/1");
});

test("the step navigation shows what is filled in and moves to a section", async ({ page }) => {
  await openGenerator(page);
  await expect(stepStatus(page, "act")).toHaveText("入力済み");
  await expect(stepStatus(page, "cast")).toHaveText("未選択");
  await expect(stepStatus(page, "look")).toHaveText("ネオン・グリッド");
  await expect(stepStatus(page, "publish")).toHaveText("キャストを選んでください");

  await pick(page, 0);
  await pick(page, 1);
  await expect(stepStatus(page, "cast")).toHaveText("2人・HO 0/2");
  await openRow(page, 0);
  await page.locator('[data-selected-index="0"] [data-field="description"]').fill("ハンドアウト本文");
  await expect(stepStatus(page, "cast")).toHaveText("2人・HO 1/2");
  await expect(stepStatus(page, "publish")).toHaveText("公開できます");

  await page.locator("#act-name").fill("");
  await expect(stepStatus(page, "act")).toHaveText("未入力");
  await expect(stepStatus(page, "publish")).toHaveText("アクトタイトルを入力してください");
  await page.locator("#act-name").fill("題");
  await page.locator('.theme-card[data-theme-value="vlad"]').click();
  await expect(stepStatus(page, "look")).toHaveText("クリムゾン・ノワール");

  await page.locator('[data-step-target="look"]').click();
  await expect(page.locator("#section-look")).toBeInViewport({ timeout: 5000 });
  await page.locator('[data-step-target="act"]').click();
  await expect(page.locator("#section-act")).toBeInViewport({ timeout: 5000 });
});

test("the publish column lists the checklist and the settings, and a private cast blocks publishing", async ({ page }) => {
  await openGenerator(page);
  await page.locator("#act-name").fill("確認リストのアクト");
  await page.locator("#ruler-name").fill("RULER A");
  await pick(page, 0);
  const checklist = page.locator("#publish-checklist li");
  await expect(checklist).toHaveCount(4);
  await expect(checklist.nth(0)).toContainText("確認リストのアクト");
  await expect(checklist.nth(1)).toContainText("RULER A");
  await expect(checklist.nth(2)).toContainText("1 / 6人");
  await expect(checklist.nth(3)).toContainText("0 / 1");
  await expect(page.locator('[data-setting="theme"]')).toHaveText("ネオン・グリッド");
  await expect(page.locator('[data-setting="background"]')).toHaveText("未設定");
  await expect(page.locator('[data-setting="scenes"]')).toHaveText("すべて A(標準)");
  await page.locator(".look-background__custom > summary").click();
  await page.locator("#background-url").fill("https://example.invalid/bg.png");
  await expect(page.locator('[data-setting="background"]')).toHaveText("自分の画像(URL)");

  await expect(page.locator("#publish-blocker")).toBeHidden();
  await page.locator("#cast-source-private").click();
  await page.locator(`[data-private-character-id="${MOCK_PRIVATE_CASTS[0].id}"]`).click();
  await expect(page.locator("#publish-blocker")).toContainText("非公開キャストを含む");
  await expect(page.locator("#publish-cinematic-button")).toBeDisabled();
  await expect(stepStatus(page, "publish")).toHaveText("非公開キャストを含むため公開できません");
});

test("the HTML export opens in a dialog and generates there; the preview stays in the page for publishing", async ({ page }) => {
  await openGenerator(page);
  await pick(page, 0);
  await openRow(page, 0);
  await page.locator('[data-selected-index="0"] [data-field="quote"]').selectOption("共通");
  const dialog = page.locator("#html-export-dialog");
  await expect(dialog).toBeHidden();
  await expect(page.locator("#showcase-preview")).toBeHidden();
  await page.locator("#open-html-export").click();
  await expect(dialog).toBeVisible();
  await expect(page.locator("#download-button")).toBeEnabled({ timeout: 15_000 });
  await expect(page.locator("#copy-button")).toBeEnabled();
  await expect(page.locator("#html-export-status")).toContainText("HTMLを生成しました");
  await expect(page.frameLocator("#showcase-preview").locator(".cast-card")).toHaveCount(1);
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#download-button").click()]);
  expect(download.suggestedFilename()).toMatch(/\.html$/);
  await page.locator("#close-html-export").click();
  await expect(dialog).toBeHidden();
});

test("the guest panel sits in the cast section and the publish column keeps its number", async ({ page }) => {
  await openGenerator(page);
  await expect(page.locator("#section-cast #showcase-guest-panel")).toBeVisible();
  await expect(page.locator("#section-publish .showcase-panel__header span")).toHaveText("04");
  await page.locator("#add-showcase-guest").click();
  await expect(page.locator("#guest-count")).toHaveText("1");
  await expect(page.locator("#section-cast .showcase-guest-editor")).toHaveCount(1);
  // The act profile keeps its own fields.
  await expect(page.locator("#section-act #act-subtitle")).toBeVisible();
  await expect(page.locator("#section-act #scenario-writer-name")).toBeVisible();
  await expect(page.locator("#act-name-length-guide")).toHaveText(/^\d+ \/ 40$/);
  await page.locator("#act-name").fill("12345678");
  await expect(page.locator("#act-name-length-guide")).toHaveText("8 / 40");
  await expect(page.locator("#section-act #publish-slug")).toBeHidden();
  await page.locator("#section-act .showcase-advanced > summary").click();
  await expect(page.locator("#publish-slug")).toBeVisible();
});

test("three columns at a wide width, stacked at a narrow one, without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openGenerator(page);
  await pick(page, 0);
  const box = async selector => (await page.locator(selector).boundingBox());
  const nav = await box("#generator-steps");
  const flow = await box(".showcase-flow");
  const publish = await box("#section-publish");
  expect(nav.x + nav.width).toBeLessThanOrEqual(flow.x);
  expect(flow.x + flow.width).toBeLessThanOrEqual(publish.x + 1);
  // Side by side: the navigation starts within the input column's height.
  expect(nav.y).toBeLessThan(flow.y + flow.height);

  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(async () => (await box("#section-publish")).y > (await box(".showcase-flow")).y).toBe(true);
    const navNow = await box("#generator-steps");
    const flowNow = await box(".showcase-flow");
    expect(navNow.y + navNow.height).toBeLessThanOrEqual(flowNow.y + 1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `no horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);
  }
});

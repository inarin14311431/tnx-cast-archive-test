import { test, expect } from "@playwright/test";
import { installShowcaseGeneratorMock, MOCK_PUBLIC_CASTS } from "./fixtures/showcase-generator-mock.mjs";

// The look section: the theme cards, the background (the chosen one large, the presets as thumbnails, a folded custom image) and the folded
// scene composition. The values stay in the fields the other modules read: #showcase-theme, #background-preset / #background-url / #background-file
// and #showcase-scenes.

async function openGenerator(page, options = {}) {
  await page.route("**/*", route => {
    const { hostname } = new URL(route.request().url());
    return hostname === "127.0.0.1" || hostname === "localhost" ? route.fallback() : route.abort();
  });
  const calls = await installShowcaseGeneratorMock(page, {
    ...options,
    rpc: { publish_act_showcase_for_current_user: "act-mock-id", replace_act_showcase_guests_for_current_user: null, ...options.rpc }
  });
  await page.goto(`/showcase-generator.html${options.query || ""}`);
  await expect(page.locator("html")).toHaveAttribute("data-showcase-generator-state", "ready", { timeout: 15_000 });
  await expect(page.locator("#public-cast-grid [data-public-character-id]").first()).toBeVisible();
  return calls;
}

const sceneButton = (page, frame, pattern) => page.locator(`#showcase-scene-composition button[data-scene-frame="${frame}"][data-scene-pattern="${pattern}"]`);

test("four theme cards set the theme field and show the theme's own colors", async ({ page }) => {
  await openGenerator(page);
  const cards = page.locator(".theme-card");
  await expect(cards).toHaveCount(4);
  await expect(cards.nth(0)).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("#showcase-theme")).toHaveValue("nova");
  await expect(page.locator(".look-theme .look-block__note")).toHaveText("HTML・スタンダード版・豪華版で共通です。");
  // each card carries four swatches painted from the theme's own palette
  const colors = await cards.evaluateAll(items => items.map(item => [...item.querySelectorAll(".theme-card__swatch i")].map(swatch => getComputedStyle(swatch).backgroundColor)));
  for (const swatches of colors) {
    expect(swatches).toHaveLength(4);
    for (const color of swatches) expect(color).toMatch(/^rgb/);
  }
  expect(new Set(colors.map(swatches => swatches.join("|"))).size).toBe(4);

  await page.locator('.theme-card[data-theme-value="vlad"]').click();
  await expect(page.locator("#showcase-theme")).toHaveValue("vlad");
  await expect(page.locator('.theme-card[data-theme-value="vlad"]')).toHaveAttribute("aria-checked", "true");
  await expect(page.locator('.theme-card[data-theme-value="nova"]')).toHaveAttribute("aria-checked", "false");
  await expect(page.locator('[data-step-status="look"]')).toHaveText("クリムゾン・ノワール");
  await expect(page.locator('[data-setting="theme"]')).toHaveText("クリムゾン・ノワール");

  // the arrow keys move the choice
  await page.locator('.theme-card[data-theme-value="vlad"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#showcase-theme")).toHaveValue("lutetia");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#showcase-theme")).toHaveValue("nova");
});

test("a theme change makes the generated HTML stale and the generated HTML uses the theme", async ({ page }) => {
  await openGenerator(page);
  await page.locator(`[data-public-character-id="${MOCK_PUBLIC_CASTS[0].id}"]`).click();
  await page.locator('#selected-casts [data-selected-index="0"] [data-action="toggle"]').click();
  await page.locator('#selected-casts [data-selected-index="0"] [data-field="quote"]').selectOption("共通");
  await page.locator("#open-html-export").click();
  await expect(page.locator("#html-export-status")).toContainText("HTMLを生成しました", { timeout: 15_000 });
  await page.locator("#close-html-export").click();
  await expect(page.locator("#showcase-preview")).toHaveAttribute("srcdoc", /./);
  await page.locator('.theme-card[data-theme-value="lutetia"]').click();
  await expect(page.locator("#showcase-preview")).not.toHaveAttribute("srcdoc", /./);
  await page.locator("#open-html-export").click();
  await expect(page.locator("#html-export-status")).toContainText("HTMLを生成しました", { timeout: 15_000 });
  // The exported page carries the chosen theme as its data-showcase-theme (showcase-dedicated-output.js).
  await expect(page.locator("#showcase-preview")).toHaveAttribute("srcdoc", /data-showcase-theme="lutetia"/);
});

test("the background shows the chosen preset large, ten thumbnails in five columns, and folds the custom image", async ({ page }) => {
  await openGenerator(page);
  await expect(page.locator("#background-current")).toHaveAttribute("data-state", "empty");
  const thumbs = page.locator("#background-preset-grid .showcase-background-preset");
  await expect(thumbs).toHaveCount(10);
  const tops = await thumbs.evaluateAll(items => items.map(item => Math.round(item.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(2);
  await expect(page.locator(".look-background__custom")).not.toHaveAttribute("open", "");
  await expect(page.locator("#background-url")).toBeHidden();

  await thumbs.nth(3).click();
  await expect(thumbs.nth(3)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#background-preset")).toHaveValue("green-area");
  await expect(page.locator("#background-current")).toHaveAttribute("data-state", "preset");
  await expect(page.locator("#background-current")).toContainText("BG 04");
  await expect(page.locator("#background-current")).toContainText("グリーンエリア");
  await expect(page.locator("#background-current img")).toHaveAttribute("src", /green-area/);
  await expect(page.locator('[data-setting="background"]')).toHaveText("グリーンエリア");
  await expect(page.locator("#background-url")).toHaveValue(/green-area/);

  // the custom image is under its own fold; the URL wins over the preset and the card says so
  await page.locator(".look-background__custom > summary").click();
  await expect(page.locator("#background-url")).toBeVisible();
  await expect(page.locator(".look-background__custom")).toContainText("URLが入力されている場合はURLを優先します");
  await page.locator("#background-url").fill("https://example.invalid/own.webp");
  await expect(page.locator("#background-preset")).toHaveValue("");
  await expect(page.locator("#background-current")).toHaveAttribute("data-state", "custom");
  await expect(page.locator("#background-current")).toContainText("自分の画像(URL)");
  await expect(page.locator("#background-preset-grid .is-selected")).toHaveCount(0);
  await expect(page.locator('[data-setting="background"]')).toHaveText("自分の画像(URL)");
});

test("a chosen file shows as the custom image, and a preset takes the file back", async ({ page }) => {
  await openGenerator(page);
  await page.locator(".look-background__custom > summary").click();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  await page.locator("#background-file").setInputFiles({ name: "own-background.png", mimeType: "image/png", buffer: png });
  await expect(page.locator("#background-current")).toContainText("自分の画像(ファイル)");
  await expect(page.locator("#background-current")).toContainText("own-background.png");
  await expect(page.locator('[data-setting="background"]')).toHaveText("自分の画像(ファイル)");
  await page.locator("#background-preset-grid .showcase-background-preset").nth(1).click();
  await expect(page.locator("#background-current")).toContainText("BG 02");
  await expect(page.locator("#background-file")).toHaveValue("");
});

test("the scene composition is folded, tagged as deluxe-only, and shows its summary", async ({ page }) => {
  await openGenerator(page);
  const host = page.locator("#showcase-scene-composition");
  await expect(host).toBeVisible();
  await expect(host).not.toHaveAttribute("open", "");
  await expect(host.locator(".look-scenes__badge")).toHaveText("豪華版のみ");
  await expect(host.locator("[data-scene-summary]")).toHaveText("すべて A(標準)");
  await expect(host.locator(".scene-choice").first()).toBeHidden();

  await host.locator("summary").click();
  const rows = host.locator(".scene-choice");
  await expect(rows).toHaveCount(6);
  await expect(rows.nth(0).locator("button")).toHaveText(["A 標準", "B:起動ターミナル"]);
  await expect(rows.nth(1).locator("button")).toHaveText(["A 標準", "B:タイトルカード"]);
  await expect(rows.nth(2).locator("button")).toHaveText(["A 標準", "B:縦組み"]);
  await expect(rows.nth(3).locator("button")).toHaveText(["A 標準", "B:ポートレート先行"]);
  await expect(rows.nth(4).locator("button")).toHaveText(["A 標準", "B:ポートレート中央"]);
  await expect(rows.nth(5).locator("button")).toHaveText(["A 標準", "B:キービジュアル"]);

  await sceneButton(page, "title", "b").click();
  await sceneButton(page, "ready", "b").click();
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"title":"b","ready":"b"}');
  await expect(host.locator("[data-scene-summary]")).toHaveText("B:タイトル・ACT READY / ほかは A");
  await expect(page.locator('[data-setting="scenes"]')).toHaveText("B:タイトル・ACT READY / ほかは A");
  await expect(sceneButton(page, "title", "b")).toHaveAttribute("aria-pressed", "true");
  await expect(sceneButton(page, "loading", "a")).toHaveAttribute("aria-pressed", "true");

  await host.locator(".scene-reset").click();
  await expect(page.locator("#showcase-scenes")).toHaveValue("");
  await expect(host.locator("[data-scene-summary]")).toHaveText("すべて A(標準)");
  await expect(sceneButton(page, "title", "a")).toHaveAttribute("aria-pressed", "true");
});

test("the composition is published as chosen and a saved act restores its buttons, theme and background", async ({ page }) => {
  const [first] = MOCK_PUBLIC_CASTS;
  const { obfuscatePublicId } = await import("../../js/showcase-restore-matching.js");
  const saved = {
    slug: "look-restore",
    actName: "見せ方の復元",
    rulerName: "",
    showcaseData: {
      version: 2, pageTitle: "ACT CAST FILE", actName: "見せ方の復元", rulerName: "", theme: "intron",
      background: "https://example.invalid/restored-background.webp",
      scenes: { loading: "b", finale: "b" },
      casts: [{ serial: obfuscatePublicId(first.public_id), fullName: "ハンドル1 テストキャスト1", styles: [{ label: "カタナ◎", handoutRole: true }], meta: [], tagline: "", handout: { title: "『カタナ』用ハンドアウト", body: "本文" } }]
    },
    participants: [{ characterId: first.id, characterPublicId: first.public_id, castOrder: 1, participationRole: "カタナ" }]
  };
  const calls = await openGenerator(page, {
    query: `?edit=${saved.slug}`,
    ownedActs: [{ slug: saved.slug, act_name: saved.actName, ruler_name: "", showcase_public: true, showcase_updated_at: "2026-09-09T00:00:00Z", updated_at: "2026-09-09T00:00:00Z" }],
    rpc: { get_owned_act_showcase_editor: saved }
  });
  await expect(page.locator("#owned-showcase-status")).toContainText("アクト紹介を復元しました", { timeout: 15_000 });
  await expect(page.locator("#showcase-theme")).toHaveValue("intron");
  await expect(page.locator('.theme-card[data-theme-value="intron"]')).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("#background-url")).toHaveValue("https://example.invalid/restored-background.webp");
  await expect(page.locator("#background-current")).toContainText("自分の画像(URL)");
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"loading":"b","finale":"b"}');
  await expect(page.locator("#showcase-scene-composition [data-scene-summary]")).toHaveText("B:ローディング・フィナーレ / ほかは A");
  await page.locator("#showcase-scene-composition > summary").click();
  await expect(sceneButton(page, "loading", "b")).toHaveAttribute("aria-pressed", "true");
  await expect(sceneButton(page, "finale", "b")).toHaveAttribute("aria-pressed", "true");
  await expect(sceneButton(page, "title", "a")).toHaveAttribute("aria-pressed", "true");

  // publishing carries the theme, the background and the composition exactly as they stand
  await sceneButton(page, "title", "b").click();
  await page.locator('#selected-casts [data-selected-index="0"] [data-action="toggle"]').click();
  await page.locator("#publish-cinematic-button").click();
  await expect.poll(() => calls.rpcCalls.filter(call => call.name === "publish_act_showcase_for_current_user").length, { timeout: 20_000 }).toBe(1);
  const published = calls.rpcCalls.find(call => call.name === "publish_act_showcase_for_current_user").body.p_showcase_data;
  expect(published.theme).toBe("intron");
  expect(published.scenes).toEqual({ loading: "b", title: "b", finale: "b" });
  expect(published.background).toBe("https://example.invalid/restored-background.webp");
});

test("no horizontal overflow of the look section at the middle and narrow widths", async ({ page }) => {
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await openGenerator(page);
    await page.locator(".look-background__custom > summary").click();
    await page.locator("#showcase-scene-composition > summary").click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `no horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);
    await page.goto("about:blank");
  }
});

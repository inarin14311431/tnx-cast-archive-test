import { test, expect } from "@playwright/test";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes, showcaseData } from "./fixtures/act-showcase-data.js";
import { formatFailure, measureContrast } from "./fixtures/act-showcase-contrast.js";

// docs/ACT_SHOWCASE_SCENES.md §6 #8: TITLE & CREDITS pattern B (title card). A showcase whose composition says
// { title: "b" } plays it; everything else plays pattern A. B uses class names of its own, so none of pattern A's decorations
// (meta strip, ghost title, rule, subtitle and scenario-writer observers) reach it, and when drawing B fails the frame is played as A.
const withScenes = (scenes, extra = {}) => ({ ...showcaseData, scenes, ...extra });
const TITLE_SCREEN = '.neotokyo-sequence__screen[data-scene="title"]';
const A_HOOKS = [".neotokyo-sequence__screen--title", ".neotokyo-sequence__act-title", ".neotokyo-sequence__ruler-credit", ".neotokyo-title-logo__meta", ".neotokyo-title-logo__ghost", ".neotokyo-title-logo__rule"];

async function openTitle(page, data, theme = "nova") {
  await installActShowcaseRoutes(page, data);
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}`);
  const advance = page.locator(".neotokyo-sequence__advance");
  await expect(advance).toHaveText("NEXT // ACT TRAILER", { timeout: 20_000 });
  await expect(page.locator(TITLE_SCREEN)).toBeVisible({ timeout: 10_000 });
  return advance;
}

test("B を選ぶと B の画面が出て、A の装飾(メタ帯・ゴースト・罫線・クレジット枠)は付かない", async ({ page }) => {
  test.setTimeout(60_000);
  const advance = await openTitle(page, withScenes({ title: "b" }, { scenarioWriterName: "脚本 太郎", heroSubTitle: "夜の都市を走る" }));
  const screen = page.locator(TITLE_SCREEN);
  await expect(screen).toHaveAttribute("data-scene-pattern", "b");
  await expect(screen).toHaveClass(/neotokyo-title-b/);
  await expect(screen.locator("h1")).toHaveText(showcaseData.actName);
  await expect(screen.locator(".neotokyo-title-b__credit-name")).toHaveText([showcaseData.rulerName, "脚本 太郎"]);
  await expect(screen.locator(".neotokyo-title-b__subtitle")).toHaveText("夜の都市を走る");
  // let the observers of pattern A run, then check that none of them found this screen
  await page.waitForTimeout(800);
  for (const selector of A_HOOKS) await expect(page.locator(selector), selector).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveClass(/showcase-neotokyo-title-logo-active/);
  await advance.click({ force: true });
  await expect(page.locator('.neotokyo-sequence__screen[data-scene="trailer"]')).toBeVisible({ timeout: 10_000 });
});

test("B は既定の副題(CAST SHOWCASE)と、無い脚本家のクレジットを出さない", async ({ page }) => {
  test.setTimeout(60_000);
  await openTitle(page, withScenes({ title: "b" }));
  const screen = page.locator(TITLE_SCREEN);
  await expect(screen.locator(".neotokyo-title-b__subtitle")).toHaveCount(0);
  await expect(screen.locator(".neotokyo-title-b__credit")).toHaveCount(1);
});

test("A を指定しても、scenes が無くても、A のまま(メタ帯などの付いた画面)", async ({ page }) => {
  test.setTimeout(60_000);
  for (const data of [withScenes({ title: "a" }), { ...showcaseData, scenes: undefined }]) {
    await openTitle(page, data);
    const screen = page.locator(TITLE_SCREEN);
    await expect(screen).toHaveAttribute("data-scene-pattern", "a");
    await expect(screen).toHaveClass(/neotokyo-sequence__screen--title/);
    await expect(page.locator(".neotokyo-title-b")).toHaveCount(0);
    await expect(page.locator(".neotokyo-title-logo__meta")).toHaveCount(1, { timeout: 10_000 });
  }
});

test("B の再生に失敗したら、その枠は A で再生され、先へ進める", async ({ page }) => {
  test.setTimeout(60_000);
  const warnings = [];
  page.on("console", message => { if (message.type() === "warning") warnings.push(message.text()); });
  // the module that builds screen B throws: the frame must not stay blank
  await page.route("**/js/act-showcase-title-b.js*", route => route.fulfill({
    contentType: "text/javascript",
    body: 'export function createTitleScreenB() { throw new Error("pattern B is broken"); }'
  }));
  const advance = await openTitle(page, withScenes({ title: "b" }));
  const screen = page.locator(TITLE_SCREEN);
  await expect(screen).toHaveAttribute("data-scene-pattern", "a");
  await expect(screen).toHaveClass(/neotokyo-sequence__screen--title/);
  await expect(page.locator(".neotokyo-title-b")).toHaveCount(0);
  expect(warnings.some(text => text.includes('scene "title" pattern "b" failed'))).toBe(true);
  await advance.click({ force: true });
  await expect(page.locator('.neotokyo-sequence__screen[data-scene="trailer"]')).toBeVisible({ timeout: 10_000 });
});

test("reduced-motion では、動かさず最終の状態をすぐ表示する", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openTitle(page, withScenes({ title: "b" }));
  const state = await page.evaluate(() => {
    const style = selector => getComputedStyle(document.querySelector(selector));
    return {
      title: [style(".neotokyo-title-b__title").clipPath, style(".neotokyo-title-b__title").animationName],
      credit: [style(".neotokyo-title-b__credit").opacity, style(".neotokyo-title-b__credit").animationName],
      edge: style(".neotokyo-title-b__edge").display,
      half: style(".neotokyo-title-b__rule-half").transform
    };
  });
  expect(state.title).toEqual(["none", "none"]);
  expect(state.credit).toEqual(["1", "none"]);
  expect(state.edge).toBe("none");
  expect(state.half).toBe("none");
});

// 390 wide is an iPhone Safari portrait; 360x640 the narrowest Android; 844x390 a phone held sideways.
for (const [width, height] of [[1440, 900], [1024, 768], [390, 844], [360, 640], [844, 390]]) {
  test(`長いアクト名でも、画面の中に収まり、横にあふれない ${width}x${height}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height });
    const actName = "夜明けを駆ける者たちと、消えた都市の記憶を追う長い一夜の物語 NEON AFTERIMAGE";
    await openTitle(page, withScenes({ title: "b" }, { actName, scenarioWriterName: "とても長い名前の脚本家 ALEXANDER VON NEON" }));
    await page.waitForTimeout(2200);
    const fit = await page.evaluate(() => {
      const box = selector => document.querySelector(selector).getBoundingClientRect();
      const stage = box(".neotokyo-sequence__stage");
      const items = [".neotokyo-title-b__title", ".neotokyo-title-b__rule", ".neotokyo-title-b__credits", ".neotokyo-title-b__eyebrow"].map(box);
      return {
        horizontal: document.documentElement.scrollWidth - innerWidth,
        outside: items.some(item => item.left < stage.left - 1 || item.right > stage.right + 1),
        titleTop: box(".neotokyo-title-b__title").top
      };
    });
    expect(fit.horizontal).toBeLessThanOrEqual(0);
    expect(fit.outside).toBe(false);
    expect(fit.titleTop).toBeGreaterThan(0);
  });
}

for (const theme of ACT_THEMES) {
  test(`B の文字コントラスト(PC幅) ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openTitle(page, withScenes({ title: "b" }, { scenarioWriterName: "脚本 太郎", heroSubTitle: "夜の都市を走る" }), theme);
    await page.waitForTimeout(2200);
    const result = await measureContrast(page);
    expect(result.items.length).toBeGreaterThan(5);
    expect(result.failures.map(formatFailure)).toEqual([]);
  });
}

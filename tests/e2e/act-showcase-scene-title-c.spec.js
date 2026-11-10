import { test, expect } from "@playwright/test";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes, showcaseData } from "./fixtures/act-showcase-data.js";
import { formatFailure, measureContrast } from "./fixtures/act-showcase-contrast.js";

// docs/ACT_SHOWCASE_SCENES.md §6 #8: TITLE & CREDITS pattern C (the opening of a film). A showcase whose composition says
// { title: "c" } plays it; everything else plays pattern A. B uses class names of its own, so none of pattern A's decorations
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

test("C を選ぶと C の画面が出て、A の装飾(メタ帯・ゴースト・罫線・クレジット枠)は付かない", async ({ page }) => {
  test.setTimeout(60_000);
  const advance = await openTitle(page, withScenes({ title: "c" }, { scenarioWriterName: "脚本 太郎", heroSubTitle: "夜の都市を走る" }));
  const screen = page.locator(TITLE_SCREEN);
  await expect(screen).toHaveAttribute("data-scene-pattern", "c");
  await expect(screen).toHaveClass(/neotokyo-title-c/);
  await expect(screen.locator("h1")).toHaveText(showcaseData.actName);
  await expect(screen.locator(".neotokyo-title-c__credit-name")).toHaveText([showcaseData.rulerName, "脚本 太郎"]);
  await expect(screen.locator(".neotokyo-title-c__subtitle")).toHaveText("夜の都市を走る");
  // let the observers of pattern A run, then check that none of them found this screen
  await page.waitForTimeout(800);
  for (const selector of A_HOOKS) await expect(page.locator(selector), selector).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveClass(/showcase-neotokyo-title-logo-active/);
  await advance.click({ force: true });
  await expect(page.locator('.neotokyo-sequence__screen[data-scene="trailer"]')).toBeVisible({ timeout: 10_000 });
});

test("C は既定の副題(CAST SHOWCASE)と、無い脚本家のクレジットを出さない", async ({ page }) => {
  test.setTimeout(60_000);
  await openTitle(page, withScenes({ title: "c" }));
  const screen = page.locator(TITLE_SCREEN);
  await expect(screen.locator(".neotokyo-title-c__subtitle")).toHaveCount(0);
  await expect(screen.locator(".neotokyo-title-c__credit")).toHaveCount(1);
});

test("A を指定しても、B を指定しても、scenes が無くても、A のまま(メタ帯などの付いた画面)", async ({ page }) => {
  test.setTimeout(60_000);
  for (const data of [withScenes({ title: "a" }), { ...showcaseData, scenes: undefined }]) {
    await openTitle(page, data);
    const screen = page.locator(TITLE_SCREEN);
    await expect(screen).toHaveAttribute("data-scene-pattern", "a");
    await expect(screen).toHaveClass(/neotokyo-sequence__screen--title/);
    await expect(page.locator(".neotokyo-title-c")).toHaveCount(0);
    await expect(page.locator(".neotokyo-title-logo__meta")).toHaveCount(1, { timeout: 10_000 });
  }
});

test("C の再生に失敗したら、その枠は A で再生され、先へ進める", async ({ page }) => {
  test.setTimeout(60_000);
  const warnings = [];
  page.on("console", message => { if (message.type() === "warning") warnings.push(message.text()); });
  // the module that builds screen B throws: the frame must not stay blank
  await page.route("**/js/act-showcase-title-c.js*", route => route.fulfill({
    contentType: "text/javascript",
    body: 'export function createTitleScreenC() { throw new Error("pattern C is broken"); }'
  }));
  const advance = await openTitle(page, withScenes({ title: "c" }));
  const screen = page.locator(TITLE_SCREEN);
  await expect(screen).toHaveAttribute("data-scene-pattern", "a");
  await expect(screen).toHaveClass(/neotokyo-sequence__screen--title/);
  await expect(page.locator(".neotokyo-title-c")).toHaveCount(0);
  expect(warnings.some(text => text.includes('scene "title" pattern "c" failed'))).toBe(true);
  await advance.click({ force: true });
  await expect(page.locator('.neotokyo-sequence__screen[data-scene="trailer"]')).toBeVisible({ timeout: 10_000 });
});

test("reduced-motion では、動かさず最終の状態をすぐ表示する", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openTitle(page, withScenes({ title: "c" }));
  const state = await page.evaluate(() => {
    const style = selector => getComputedStyle(document.querySelector(selector));
    return {
      frame: [style(".neotokyo-title-c__frame").clipPath, style(".neotokyo-title-c__frame").animationName],
      title: [style(".neotokyo-title-c__title").opacity, style(".neotokyo-title-c__title").animationName, style(".neotokyo-title-c__title").letterSpacing],
      credits: [style(".neotokyo-title-c__credits").opacity, style(".neotokyo-title-c__credits").animationName],
      flare: style(".neotokyo-title-c__flare").display
    };
  });
  expect(state.frame).toEqual(["none", "none"]);
  expect(state.title[0]).toBe("1");
  expect(state.title[1]).toBe("none");
  expect(parseFloat(state.title[2])).toBeGreaterThan(0);
  expect(state.credits).toEqual(["1", "none"]);
  expect(state.flare).toBe("none");
});

test("上下の黒帯と枠が舞台いっぱいに出て、アクト名が枠の中央に収まる(PC幅)", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openTitle(page, withScenes({ title: "c" }));
  await page.waitForTimeout(3200);
  const box = await page.evaluate(() => {
    const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
    return { stage: rect(".neotokyo-sequence__stage"), screen: rect(".neotokyo-title-c"), top: rect(".neotokyo-title-c__band--top"), frame: rect(".neotokyo-title-c__frame"), bottom: rect(".neotokyo-title-c__band--bottom"), title: rect(".neotokyo-title-c__title") };
  });
  expect(Math.abs(box.screen.top - box.stage.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.screen.bottom - box.stage.bottom)).toBeLessThanOrEqual(1);
  expect(box.top.bottom).toBeLessThanOrEqual(box.frame.top + 1);
  expect(box.frame.bottom).toBeLessThanOrEqual(box.bottom.top + 1);
  expect(box.title.left).toBeGreaterThanOrEqual(box.frame.left);
  expect(box.title.right).toBeLessThanOrEqual(box.frame.right);
  const frameMiddle = (box.frame.top + box.frame.bottom) / 2;
  expect(Math.abs((box.title.top + box.title.bottom) / 2 - frameMiddle)).toBeLessThan((box.frame.bottom - box.frame.top) / 2);
});

// 390 wide is an iPhone Safari portrait; 360x640 the narrowest Android; 844x390 a phone held sideways.
for (const [width, height] of [[1440, 900], [1024, 768], [390, 844], [360, 640], [844, 390]]) {
  test(`長いアクト名でも、画面の中に収まり、横にあふれない ${width}x${height}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height });
    const actName = "夜明けを駆ける者たちと、消えた都市の記憶を追う長い一夜の物語 NEON AFTERIMAGE";
    await openTitle(page, withScenes({ title: "c" }, { actName, scenarioWriterName: "とても長い名前の脚本家 ALEXANDER VON NEON" }));
    await page.waitForTimeout(3200);
    const fit = await page.evaluate(() => {
      const box = selector => document.querySelector(selector).getBoundingClientRect();
      const stage = box(".neotokyo-sequence__stage");
      const items = [".neotokyo-title-c__title", ".neotokyo-title-c__credits", ".neotokyo-title-c__eyebrow", ".neotokyo-title-c__frame"].map(box);
      return {
        horizontal: document.documentElement.scrollWidth - innerWidth,
        outside: items.some(item => item.left < stage.left - 1 || item.right > stage.right + 1),
        titleTop: box(".neotokyo-title-c__title").top,
        creditsInsideFrame: box(".neotokyo-title-c__credits").bottom <= box(".neotokyo-title-c__frame").bottom + 1 && box(".neotokyo-title-c__title").top >= box(".neotokyo-title-c__frame").top - 1
      };
    });
    expect(fit.horizontal).toBeLessThanOrEqual(0);
    expect(fit.outside).toBe(false);
    expect(fit.titleTop).toBeGreaterThan(0);
    expect(fit.creditsInsideFrame).toBe(true);
  });
}

for (const theme of ACT_THEMES) {
  test(`C の文字コントラスト(PC幅) ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openTitle(page, withScenes({ title: "c" }, { scenarioWriterName: "脚本 太郎", heroSubTitle: "夜の都市を走る" }), theme);
    await page.waitForTimeout(3200);
    const result = await measureContrast(page);
    expect(result.items.length).toBeGreaterThan(5);
    expect(result.failures.map(formatFailure)).toEqual([]);
  });
}

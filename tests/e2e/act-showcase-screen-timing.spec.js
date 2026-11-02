import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { ACT_SLUG, installActShowcaseRoutes, showcaseData } from "./fixtures/act-showcase-data.js";

// Two things a visitor on a real screen and a real network meets, which a fast desktop never shows:
//  1. the footer (and the NEXT button) must stay on a screen shorter than 560px, where the shell used to be at least 560px high;
//  2. the web fonts of a screen load lazily and keep their text invisible until they arrive (display=block), so the title and the
//     trailer readout used to start from the middle: the screen is now shown once its fonts are in, and its animation and typing
//     start then (js/act-showcase-neotokyo.js, swapScreen with waitForFonts).
const withScenes = scenes => ({ ...showcaseData, scenes });
const FONT_DIR = "node_modules/@fontsource/noto-sans-jp/files/";

for (const [width, height] of [[1280, 500], [1280, 540], [844, 390], [390, 844]]) {
  for (const scenes of [undefined, { title: "b" }]) {
    test(`短い画面でも、フッターと NEXT ボタンが画面の中にある ${width}x${height} ${scenes ? "title B" : "title A"}`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width, height });
      await installActShowcaseRoutes(page, scenes ? withScenes(scenes) : showcaseData);
      await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=nova`);
      await expect(page.locator(".neotokyo-sequence__advance")).toHaveText("NEXT // ACT TRAILER", { timeout: 20_000 });
      await page.waitForTimeout(1800);
      const fit = await page.evaluate(() => {
        const box = selector => document.querySelector(selector).getBoundingClientRect();
        return { viewport: innerHeight, shell: box(".neotokyo-sequence__shell").bottom, footer: box(".neotokyo-sequence__footer").bottom, advance: box(".neotokyo-sequence__advance").bottom };
      });
      expect(fit.shell).toBeLessThanOrEqual(fit.viewport + 1);
      expect(fit.footer).toBeLessThanOrEqual(fit.viewport + 1);
      expect(fit.advance).toBeLessThanOrEqual(fit.viewport + 1);
    });
  }
}

// The letterbox bars (the shell's ::before / ::after) are as high as 2.2vh, but must never be higher than the shell padding on their
// side: above 1000px of height (727px on a phone) they used to cover the last pixels of the footer, the bottom border of the NEXT button.
test("上下の黒い帯は、その下の余白より高くならない(フッターの下辺を覆わない)", async ({ page }) => {
  test.setTimeout(90_000);
  await installActShowcaseRoutes(page, showcaseData);
  await page.setViewportSize({ width: 1920, height: 1040 });
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=nova`);
  await expect(page.locator(".neotokyo-sequence__advance")).toHaveText("NEXT // ACT TRAILER", { timeout: 20_000 });
  for (const [width, height] of [[1920, 1040], [1920, 1200], [390, 844], [430, 932]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(300);
    const bars = await page.evaluate(() => {
      const shell = document.querySelector(".neotokyo-sequence__shell");
      const style = getComputedStyle(shell);
      const footer = document.querySelector(".neotokyo-sequence__footer").getBoundingClientRect();
      return {
        top: [parseFloat(getComputedStyle(shell, "::before").height), parseFloat(style.paddingTop)],
        bottom: [parseFloat(getComputedStyle(shell, "::after").height), parseFloat(style.paddingBottom)],
        footerBottom: footer.bottom,
        barTop: innerHeight - parseFloat(getComputedStyle(shell, "::after").height)
      };
    });
    expect(bars.top[0], `top bar at ${width}x${height}`).toBeLessThanOrEqual(bars.top[1] + 0.01);
    expect(bars.bottom[0], `bottom bar at ${width}x${height}`).toBeLessThanOrEqual(bars.bottom[1] + 0.01);
    // the footer ends above the bottom bar
    expect(bars.footerBottom, `footer bottom at ${width}x${height}`).toBeLessThanOrEqual(bars.barTop + 0.01);
  }
});

// Web fonts that arrive late: the block-period faces of every weight the page asks for, answered after `delay` ms.
async function lateFonts(page, delay) {
  const sets = { japanese: "U+3000-9FFF,U+FF00-FFEF", latin: "U+0000-00FF" };
  const css = [400, 500, 700, 900].flatMap(weight => Object.entries(sets).map(([set, range]) =>
    `@font-face{font-family:"Noto Sans JP";font-style:normal;font-weight:${weight};font-display:block;src:url(https://fonts.gstatic.com/t/${set}-${weight}.woff2) format("woff2");unicode-range:${range}}`)).join("\n");
  await page.route("https://fonts.googleapis.com/**", route => route.fulfill({ contentType: "text/css", body: css }));
  await page.route("https://fonts.gstatic.com/**", async route => {
    await new Promise(resolve => setTimeout(resolve, delay));
    const [, set, weight] = route.request().url().match(/t\/(\w+)-(\d+)\.woff2/);
    await route.fulfill({ contentType: "font/woff2", body: readFileSync(`${FONT_DIR}noto-sans-jp-${set}-${weight}-normal.woff2`) });
  });
}

// What the visitor sees the moment a screen becomes visible: how far its animations and its typing have already gone.
async function recordFirstSight(page) {
  await page.addInitScript(() => {
    window.__firstSight = {};
    window.__insertedAt = {};
    new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) if (node.dataset?.scene && !window.__insertedAt[node.dataset.scene]) window.__insertedAt[node.dataset.scene] = Math.round(performance.now());
        if (record.type !== "attributes") continue;
        const screen = record.target;
        const scene = screen.dataset?.scene;
        if (!scene || !screen.classList.contains("is-visible") || window.__firstSight[scene]) continue;
        const animations = [...screen.querySelectorAll("*")].flatMap(element => element.getAnimations().map(animation => Number(animation.currentTime) || 0));
        const read = screen.querySelector(".neotokyo-sequence__readout-read");
        window.__firstSight[scene] = { at: Math.round(performance.now()), animation: Math.round(Math.max(0, ...animations)), read: read ? read.textContent.length : 0 };
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
  });
}

for (const pattern of ["a", "b"]) {
  test(`フォントが遅れても、タイトルとトレーラーの読み上げは最初から見える(パターン ${pattern.toUpperCase()})`, async ({ page }) => {
    test.setTimeout(90_000);
    await installActShowcaseRoutes(page, withScenes({ title: pattern, trailer: pattern }));
    await lateFonts(page, 1200);
    await recordFirstSight(page);
    await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=nova`);
    const advance = page.locator(".neotokyo-sequence__advance");
    await expect(advance).toHaveText("NEXT // ACT TRAILER", { timeout: 30_000 });
    await expect(page.locator('.neotokyo-sequence__screen[data-scene="title"]')).toHaveClass(/is-visible/, { timeout: 15_000 });
    await advance.click({ force: true });
    await expect(page.locator('.neotokyo-sequence__screen[data-scene="trailer"]')).toHaveClass(/is-visible/, { timeout: 15_000 });
    const seen = await page.evaluate(() => window.__firstSight);
    // the title's animation has barely begun, and nothing of the trailer is typed yet, when each screen first shows
    expect(seen.title.animation).toBeLessThan(600);
    expect(seen.trailer.read).toBeLessThanOrEqual(2);
    // and the sequence goes on to the end of the readout
    await expect(advance).toHaveText("NEXT // HANDOUT 01", { timeout: 30_000 });
  });
}

test("フォントがとても遅くても、待つのは上限まで(約2.5秒)で、シーケンスは進む", async ({ page }) => {
  test.setTimeout(90_000);
  await installActShowcaseRoutes(page, withScenes({ title: "b" }));
  await lateFonts(page, 15_000);
  await recordFirstSight(page);
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=nova`);
  await expect(page.locator('.neotokyo-sequence__screen[data-scene="title"]')).toHaveClass(/is-visible/, { timeout: 20_000 });
  const { seen, inserted } = await page.evaluate(() => ({ seen: window.__firstSight, inserted: window.__insertedAt }));
  expect(seen.title).toBeTruthy();
  // the title is shown at most the font cap (2.5 s) plus a few frames after it was put in; the 15 s of the fonts are not waited for
  expect(seen.title.at - inserted.title).toBeLessThan(4_000);
  expect(seen.title.at - inserted.title).toBeGreaterThan(1_500);
});

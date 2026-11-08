import { test, expect } from "@playwright/test";
import { settleVisualPage } from "./visual-fixtures.js";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes, showcaseData } from "./act-showcase-fixtures.js";

// Pattern B of the loading frame (docs/ACT_SHOWCASE_SCENES.md §6 #7, 6th pattern: the ACCESS screen once the data has arrived, the
// "boot terminal"), the screen once the whole log is shown and ACCESS GRANTED is up:
//
//   act-showcase-loading-b-<theme>-<project>.png          the default act (three casts, one guest, the writer), every theme
//   act-showcase-loading-b-six-nova-<project>.png         six casts with the longest handles, nova only
//
// The static loading screen before the data arrives is common to every pattern and is captured by act-showcase-deluxe.visual.spec.js.
//
// The spec skips itself while the page under test does not offer pattern "b" for the loading frame yet, so this file can be
// merged before the pattern itself and never turns other pull requests red; the images come from the CI artifact of the
// pull request that adds the pattern (docs/TESTING_STRATEGY.md section 8).
//
// The visual config sets reducedMotion: "reduce", where pattern B shows every line at once and holds the screen for as long as
// pattern A holds its ACCESS screen (2900ms), then moves on by itself. That one timer is held (matched by its duration, as
// act-showcase-deluxe.visual.spec.js does for pattern A) until the capture is done.
const WRITER = "脚本 太郎";
const HOLD_MS = 2900;
const LONG_HANDLE = "“夜明けを駆け抜けるネオンの亡霊” 神楽坂 ALEXANDER VON NEON 零式";
const sixCasts = () => Array.from({ length: 6 }, (_, index) => ({
  ...showcaseData.casts[index % 3],
  fullName: index % 2 ? LONG_HANDLE : "“ル” 名"
}));

async function pageOffersLoadingB(page) {
  // A script URL is a document of the same origin: nothing of the showcase page runs, and import() can read the module.
  await page.goto("/js/act-showcase-scenes.js");
  return page.evaluate(async () => {
    try {
      const { SCENE_PATTERNS } = await import("/js/act-showcase-scenes.js");
      return Boolean(SCENE_PATTERNS.loading?.includes("b"));
    } catch {
      return false;
    }
  });
}

async function holdScreenTimer(page) {
  await page.addInitScript(duration => {
    const nativeSetTimeout = window.setTimeout;
    window.setTimeout = function (callback, delay, ...args) {
      if (delay !== duration || window.__releaseLoadingScreen) return nativeSetTimeout.call(this, callback, delay, ...args);
      let released = false;
      const fire = () => {
        if (released) return;
        released = true;
        callback(...args);
      };
      window.__releaseLoadingScreen = fire;
      return nativeSetTimeout.call(this, fire, 600_000);
    };
  }, HOLD_MS);
}

async function openLoadingB(page, theme, options) {
  await installActShowcaseRoutes(page, { scenes: { loading: "b" }, scenarioWriterName: WRITER, ...options });
  await holdScreenTimer(page);
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}`);
  await expect(page.locator("html")).toHaveAttribute("data-showcase-theme", theme);
  const screen = page.locator('.neotokyo-sequence__screen[data-scene="loading"]');
  await expect(screen).toHaveAttribute("data-scene-pattern", "b", { timeout: 15_000 });
  await expect(screen).toHaveClass(/is-visible/);
  await expect(page.locator(".neotokyo-loading-b__granted")).toBeVisible();
}

async function capture(page, name) {
  await settleVisualPage(page);
  await page.waitForTimeout(400);
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: false });
  await page.evaluate(() => window.__releaseLoadingScreen?.());
}

for (const theme of ACT_THEMES) {
  test(`アクト紹介(豪華版・loading B) ${theme}`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    test.skip(!(await pageOffersLoadingB(page)), "pattern B of the loading frame is not in this build yet");
    await openLoadingB(page, theme);
    await capture(page, `act-showcase-loading-b-${theme}-${testInfo.project.name}`);
  });
}

test("アクト紹介(豪華版・loading B・6人と長いハンドル) nova", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  test.skip(!(await pageOffersLoadingB(page)), "pattern B of the loading frame is not in this build yet");
  await openLoadingB(page, "nova", { casts: sixCasts() });
  await capture(page, `act-showcase-loading-b-six-nova-${testInfo.project.name}`);
});

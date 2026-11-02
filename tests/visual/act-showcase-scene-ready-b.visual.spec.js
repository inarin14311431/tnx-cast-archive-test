import { test, expect } from "@playwright/test";
import { settleVisualPage } from "./visual-fixtures.js";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes, showcaseData } from "./act-showcase-fixtures.js";

// Pattern B of the ACT READY frame (docs/ACT_SHOWCASE_SCENES.md §6 #7, 3rd pattern), the screen once its footer button is shown:
//
//   act-showcase-ready-b[-six]-<theme>-<project>.png
//
//   ready-b       the default act (three casts, one guest, the scenario-writer credit), in every theme
//   ready-b-six   six casts with the longest names, nova only
//
// The spec skips itself while the page under test does not offer pattern "b" for the ready frame yet, so this file can be
// merged before the pattern itself and never turns other pull requests red; the images come from the CI artifact of the
// pull request that adds the pattern (docs/TESTING_STRATEGY.md section 8).
const WRITER = "脚本 太郎";
const LONG_NAME = "“夜明けを駆け抜けるネオンの亡霊” 神楽坂 ALEXANDER VON NEON 零式";
const sixCasts = () => Array.from({ length: 6 }, (_, index) => ({
  ...showcaseData.casts[index % 3],
  fullName: index % 2 ? LONG_NAME : "ル 名"
}));

async function pageOffersReadyB(page) {
  // A script URL is a document of the same origin: nothing of the showcase page runs, and import() can read the module.
  await page.goto("/js/act-showcase-scenes.js");
  return page.evaluate(async () => {
    try {
      const { SCENE_PATTERNS } = await import("/js/act-showcase-scenes.js");
      return Boolean(SCENE_PATTERNS.ready?.includes("b"));
    } catch {
      return false;
    }
  });
}

async function capture(page, name) {
  await settleVisualPage(page);
  // the casts flicker in one after the other and the rows last: about 1.5 seconds; animations are also fast-forwarded by the screenshot
  await page.waitForTimeout(2400);
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: false });
}

async function playToReady(page, theme, options) {
  await installActShowcaseRoutes(page, { scenes: { ready: "b" }, scenarioWriterName: WRITER, ...options });
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}`);
  await expect(page.locator("html")).toHaveAttribute("data-showcase-theme", theme);
  const advance = page.locator(".neotokyo-sequence__advance");
  for (let step = 0; step < 20; step += 1) {
    await expect(advance).toBeVisible({ timeout: 20_000 });
    const label = ((await advance.textContent()) || "").trim();
    if (label === "OPEN FULL SHOWCASE") break;
    await advance.click({ force: true });
    await expect.poll(async () => ((await advance.textContent()) || "").trim() !== label || !(await advance.isVisible()), { timeout: 15_000 }).toBe(true);
  }
  await expect(page.locator('.neotokyo-sequence__screen[data-scene="ready"]')).toHaveAttribute("data-scene-pattern", "b");
  await expect(page.locator('.neotokyo-sequence__screen[data-scene="ready"]')).toHaveClass(/is-visible/);
}

for (const theme of ACT_THEMES) {
  test(`アクト紹介(豪華版・ready B) ${theme}`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    test.skip(!(await pageOffersReadyB(page)), "pattern B of the ready frame is not in this build yet");
    await playToReady(page, theme);
    await capture(page, `act-showcase-ready-b-${theme}-${testInfo.project.name}`);
  });
}

test("アクト紹介(豪華版・ready B・6人と長い名前) nova", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(!(await pageOffersReadyB(page)), "pattern B of the ready frame is not in this build yet");
  await playToReady(page, "nova", { casts: sixCasts() });
  await capture(page, `act-showcase-ready-b-six-nova-${testInfo.project.name}`);
});

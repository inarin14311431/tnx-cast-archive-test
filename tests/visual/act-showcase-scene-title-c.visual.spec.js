import { test, expect } from "@playwright/test";
import { settleVisualPage } from "./visual-fixtures.js";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes } from "./act-showcase-fixtures.js";

// Pattern C of the TITLE & CREDITS frame (docs/ACT_SHOWCASE_SCENES.md §6 #7 (4th pattern: title C)), the screen once its NEXT button is shown:
//
//   act-showcase-title-c[-long]-<theme>-<project>.png
//
//   title-c       the default act (one credit, no subtitle), in every theme
//   title-c-long  a long act name with the subtitle and the scenario-writer credit, nova only
//
// The spec skips itself while the page under test does not offer pattern "b" for the title frame yet, so this file and its
// images can be merged before the pattern itself and never turn other pull requests red.
const LONG = {
  actName: "夜明けを駆ける者たちと、消えた都市の記憶を追う長い一夜の物語",
  heroSubTitle: "NEON AFTERIMAGE // 第一話",
  scenarioWriterName: "脚本 太郎"
};

async function pageOffersTitleC(page) {
  // A script URL is a document of the same origin: nothing of the showcase page runs, and import() can read the module.
  await page.goto("/js/act-showcase-scenes.js");
  return page.evaluate(async () => {
    try {
      const { SCENE_PATTERNS } = await import("/js/act-showcase-scenes.js");
      return Boolean(SCENE_PATTERNS.title?.includes("c"));
    } catch {
      return false;
    }
  });
}

async function capture(page, name) {
  await settleVisualPage(page);
  // the aperture, the letter spacing closing in and the credits take about three seconds; the slow push-in is a finite animation that the screenshot fast-forwards to its end; animations are also fast-forwarded by the screenshot
  await page.waitForTimeout(3600);
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: false });
}

async function playToTitle(page, theme, data) {
  await installActShowcaseRoutes(page, { scenes: { title: "c" }, ...data });
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}`);
  await expect(page.locator("html")).toHaveAttribute("data-showcase-theme", theme);
  await expect(page.locator(".neotokyo-sequence__advance")).toHaveText("NEXT // ACT TRAILER", { timeout: 15_000 });
  await expect(page.locator('.neotokyo-sequence__screen[data-scene="title"]')).toHaveAttribute("data-scene-pattern", "c");
}

for (const theme of ACT_THEMES) {
  test(`アクト紹介(豪華版・title C) ${theme}`, async ({ page }, testInfo) => {
    test.skip(!(await pageOffersTitleC(page)), "pattern C of the title frame is not in this build yet");
    await playToTitle(page, theme);
    await capture(page, `act-showcase-title-c-${theme}-${testInfo.project.name}`);
  });
}

test("アクト紹介(豪華版・title C・長いアクト名) nova", async ({ page }, testInfo) => {
  test.skip(!(await pageOffersTitleC(page)), "pattern C of the title frame is not in this build yet");
  await playToTitle(page, "nova", LONG);
  await capture(page, `act-showcase-title-c-long-nova-${testInfo.project.name}`);
});

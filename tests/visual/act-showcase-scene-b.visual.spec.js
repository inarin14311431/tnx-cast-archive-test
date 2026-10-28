import { test, expect } from "@playwright/test";
import { settleVisualPage } from "./visual-fixtures.js";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes } from "./act-showcase-fixtures.js";

// Pattern B of the ACT TRAILER frame (docs/ACT_SHOWCASE_SCENES.md §6 #7), the screen once its NEXT button is shown:
//
//   act-showcase-trailer-b[-long]-<theme>-<project>.png
//
//   trailer-b       the default two-line trailer text, in every theme
//   trailer-b-long  a long text (about 200 characters, five paragraphs), nova only: the text scrolls in its own box
//
// The spec skips itself while the page under test does not offer pattern "b" for the trailer frame yet, so this file
// and its images can be merged before the pattern itself and never turn other pull requests red.
const LONG_TRAILER = [
  "夜のN◎VAに未明の警報が響く。消えたデータの痕跡を追い、三人のキャストが動き出す。",
  "雨に濡れた高架の下、旧式のデッキが最後の通信を吐き出した。差出人は三年前に死んだはずの情報屋。",
  "手がかりは暗号化された座標と、都市の誰もが知っている童謡の一節だけだった。",
  "企業の監視網をすり抜け、地下の闇市を抜け、夜明けまでに真実へ辿り着けるのか。",
  "選ばれた者たちの長い一夜が、いま静かに幕を開ける。"
].join("\n");

async function pageOffersTrailerB(page) {
  // A script URL is a document of the same origin: nothing of the showcase page runs, and import() can read the module.
  await page.goto("/js/act-showcase-scenes.js");
  // A build without the module at all (an old runtime) has no pattern B either: the import fails and the spec skips.
  return page.evaluate(async () => {
    try {
      const { SCENE_PATTERNS } = await import("/js/act-showcase-scenes.js");
      return Boolean(SCENE_PATTERNS.trailer?.includes("b"));
    } catch {
      return false;
    }
  });
}

async function capture(page, name) {
  await settleVisualPage(page);
  await page.evaluate(() => new Promise(resolve => {
    let frames = 0;
    const tick = () => (++frames >= 4 ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  }));
  await page.waitForTimeout(350);
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: false });
}

async function playToTrailer(page, theme, trailerBody) {
  await installActShowcaseRoutes(page, { scenes: { trailer: "b" }, trailerBody });
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}`);
  await expect(page.locator("html")).toHaveAttribute("data-showcase-theme", theme);
  // the ACCESS screen leaves by itself; the title waits for NEXT, then the trailer is read out and waits for NEXT again
  const advance = page.locator(".neotokyo-sequence__advance");
  await expect(advance).toHaveText("NEXT // ACT TRAILER", { timeout: 15_000 });
  await advance.click({ force: true });
  await expect(advance).toHaveText("NEXT // HANDOUT 01", { timeout: 15_000 });
  await expect(page.locator('.neotokyo-sequence__screen[data-scene="trailer"]')).toHaveAttribute("data-scene-pattern", "b");
}

for (const theme of ACT_THEMES) {
  test(`アクト紹介(豪華版・trailer B) ${theme}`, async ({ page }, testInfo) => {
    test.skip(!(await pageOffersTrailerB(page)), "pattern B of the trailer frame is not in this build yet");
    await playToTrailer(page, theme);
    await capture(page, `act-showcase-trailer-b-${theme}-${testInfo.project.name}`);
  });
}

test("アクト紹介(豪華版・trailer B・長文) nova", async ({ page }, testInfo) => {
  test.skip(!(await pageOffersTrailerB(page)), "pattern B of the trailer frame is not in this build yet");
  await playToTrailer(page, "nova", LONG_TRAILER);
  await capture(page, `act-showcase-trailer-b-long-nova-${testInfo.project.name}`);
});

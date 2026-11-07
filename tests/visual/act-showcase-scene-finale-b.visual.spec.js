import { test, expect } from "@playwright/test";
import { settleVisualPage } from "./visual-fixtures.js";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes, showcaseData } from "./act-showcase-fixtures.js";

// Pattern B of the finale frame (docs/ACT_SHOWCASE_SCENES.md §6 #7, 5th pattern: the page itself after the sequence, the "key visual"):
//
//   act-showcase-finale-b-<theme>-<project>.png          the top of the page (the hero: the cast side by side, the act name over it,
//                                                        the credits strip), the default act (three casts, one guest, the writer), every theme
//   act-showcase-finale-b-cards-<theme>-<project>.png    the cast cards, scrolled to the top of the card grid (nova only)
//   act-showcase-finale-b-six-nova-<project>.png         the hero with six casts and the longest names
//   act-showcase-finale-b-six-cards-nova-<project>.png   the cast cards with six casts and the longest names
//
// The spec skips itself while the page under test does not offer pattern "b" for the finale frame yet, so this file can be
// merged before the pattern itself and never turns other pull requests red; the images come from the CI artifact of the
// pull request that adds the pattern (docs/TESTING_STRATEGY.md section 8).
//
// The sequence is skipped (SKIP SEQUENCE), not played: the finale is the page under the overlay, drawn before the sequence starts.
const WRITER = "脚本 太郎";
const LONG_NAME = "“夜明けを駆け抜けるネオンの亡霊” 神楽坂 ALEXANDER VON NEON 零式";
const sixCasts = () => Array.from({ length: 6 }, (_, index) => ({
  ...showcaseData.casts[index % 3],
  fullName: index % 2 ? LONG_NAME : "ル 名"
}));

async function pageOffersFinaleB(page) {
  // A script URL is a document of the same origin: nothing of the showcase page runs, and import() can read the module.
  await page.goto("/js/act-showcase-scenes.js");
  return page.evaluate(async () => {
    try {
      const { SCENE_PATTERNS } = await import("/js/act-showcase-scenes.js");
      return Boolean(SCENE_PATTERNS.finale?.includes("b"));
    } catch {
      return false;
    }
  });
}

async function openFinale(page, theme, options) {
  await installActShowcaseRoutes(page, { scenes: { finale: "b" }, scenarioWriterName: WRITER, ...options });
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}`);
  await expect(page.locator("html")).toHaveAttribute("data-showcase-theme", theme);
  await expect(page.locator("#act-showcase-root")).toHaveAttribute("data-scene-pattern", "b");
  // SKIP SEQUENCE ends the sequence at once; the overlay hides and is removed 850ms later, leaving the page at the top
  const skip = page.locator(".neotokyo-sequence__skip");
  await expect(skip).toBeVisible({ timeout: 20_000 });
  await skip.click({ force: true });
  await expect(page.locator("#cinematic-intro")).toHaveCount(0, { timeout: 8_000 });
  await expect(page.locator(".neotokyo-finale-b")).toBeVisible();
}

// settleVisualPage ends with window.scrollTo(0, 0), so the scroll to the cards comes after it, never before.
async function capture(page, name, { cards = false } = {}) {
  await settleVisualPage(page);
  // the short fade-in of the hero and the images: about 1 second; animations are also fast-forwarded by the screenshot
  await page.waitForTimeout(1800);
  if (cards) {
    await page.locator(".neotokyo-finale-b__cards").evaluate(element => {
      window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top);
    });
    await page.waitForTimeout(400);
    // the card grid is at the top of the window, so the page really scrolled (the hero is at least 420px high)
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(400);
  }
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: false });
}

for (const theme of ACT_THEMES) {
  test(`アクト紹介(豪華版・finale B) ${theme}`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    test.skip(!(await pageOffersFinaleB(page)), "pattern B of the finale frame is not in this build yet");
    await openFinale(page, theme);
    await capture(page, `act-showcase-finale-b-${theme}-${testInfo.project.name}`);
    if (theme === "nova") {
      await capture(page, `act-showcase-finale-b-cards-${theme}-${testInfo.project.name}`, { cards: true });
    }
  });
}

test("アクト紹介(豪華版・finale B・6人と長い名前) nova", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(!(await pageOffersFinaleB(page)), "pattern B of the finale frame is not in this build yet");
  await openFinale(page, "nova", { casts: sixCasts() });
  await capture(page, `act-showcase-finale-b-six-nova-${testInfo.project.name}`);
  await capture(page, `act-showcase-finale-b-six-cards-nova-${testInfo.project.name}`, { cards: true });
});

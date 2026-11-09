import { test, expect } from "@playwright/test";
import { installVisualEnvironment, settleVisualPage } from "./visual-fixtures.js";

// The cast section of the showcase generator (docs/SHOWCASE_GENERATOR_REDESIGN.md): three public casts picked, the handout of the first one
// opened. One state, in the two themes the operational pages use; the generator's own first screen is captured by operational-pages.visual.spec.js.
//
//   showcase-generator-cast-open-<theme>-<project>.png
//
// The spec skips itself while the page under test has no picture area in the manual-cast form (the last step of the redesign), so this
// file can be merged first and never turns other pull requests red; the images come from the CI artifact of the pull request that
// completes the redesign (docs/TESTING_STRATEGY.md section 8).

const THEMES = ["nova", "spectrum-neon"];

for (const theme of THEMES) {
  test(`アクト紹介生成・キャスト3人とハンドアウト ${theme}`, async ({ page }, testInfo) => {
    await installVisualEnvironment(page, { authenticated: true, theme });
    await page.goto("/showcase-generator.html");
    await expect(page.locator("#public-cast-grid .cast-pick-card").first()).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-showcase-generator-state", "ready");
    test.skip(await page.locator("#manual-image-clear").count() === 0, "手動キャストの画像の枠がまだ無いページでは撮らない");

    const cards = page.locator("#public-cast-grid .cast-pick-card");
    for (let index = 0; index < 3; index += 1) await cards.nth(index).click();
    await expect(page.locator("#selected-casts [data-selected-index]")).toHaveCount(3);
    await page.locator('#selected-casts [data-selected-index="0"] [data-action="toggle"]').click();
    await expect(page.locator('#selected-casts [data-selected-index="0"] .cast-row__panel')).toBeVisible();

    // settleVisualPage ends by scrolling to the top: scroll to the section only afterwards
    await settleVisualPage(page);
    const legalFooter = page.locator("[data-legal-footer]");
    if (await legalFooter.count()) await legalFooter.evaluate(element => { element.style.visibility = "hidden"; });
    await page.evaluate(() => {
      const section = document.querySelector("#section-cast");
      window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY - 16);
    });
    await expect(page).toHaveScreenshot(`showcase-generator-cast-open-${theme}-${testInfo.project.name}.png`, { fullPage: false });
  });
}

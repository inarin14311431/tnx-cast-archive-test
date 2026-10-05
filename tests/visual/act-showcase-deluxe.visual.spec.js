import { test, expect } from "@playwright/test";
import { settleVisualPage } from "./visual-fixtures.js";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes } from "./act-showcase-fixtures.js";

// The cinematic sequence advances only on the NEXT button. Its label names the scene that has just
// finished typing, so each capture waits for a label instead of a timer.
const SCENES = [
  { scene: "title", label: "NEXT // ACT TRAILER" },
  { scene: "trailer", label: "NEXT // HANDOUT 01" },
  { scene: "handout", label: "ASSIGN // PC1" },
  { scene: "assign", label: "NEXT // HANDOUT 02" }
];
const SUMMARY_LABEL = "NEXT // ACT SUMMARY";

async function settleFrames(page) {
  await page.evaluate(() => new Promise(resolve => {
    let frames = 0;
    const tick = () => (++frames >= 4 ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  }));
  await page.waitForTimeout(350);
}

async function capture(page, name) {
  await settleVisualPage(page);
  await settleFrames(page);
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: false });
}

async function playSequence(page, theme, projectName) {
  await installActShowcaseRoutes(page);
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}`);
  await expect(page.locator("html")).toHaveAttribute("data-showcase-theme", theme);
  const advance = page.locator(".neotokyo-sequence__advance");
  for (const { scene, label } of SCENES) {
    await expect(advance).toHaveText(label, { timeout: 15_000 });
    await expect(advance).toBeVisible();
    await capture(page, `act-showcase-${scene}-${theme}-${projectName}`);
    await advance.click({ force: true });
  }
  // The remaining handout/assign pairs (PC2, PC3) are walked through without a capture.
  for (let step = 0; step < 12; step += 1) {
    await expect(advance).toBeVisible({ timeout: 15_000 });
    const label = ((await advance.textContent()) || "").trim();
    await advance.click({ force: true });
    if (label === SUMMARY_LABEL) break;
    await expect(advance).not.toHaveText(label, { timeout: 15_000 });
  }
  // ACT SUMMARY: the NEXT button is replaced by the finale's own access button.
  const access = page.locator(".neotokyo-finale__access-button");
  await expect(access).toBeVisible({ timeout: 15_000 });
  await capture(page, `act-showcase-summary-${theme}-${projectName}`);
  await access.click({ force: true });
  await expect(page.locator("#cinematic-intro")).toHaveAttribute("aria-hidden", "true", { timeout: 8_000 });
  const board = page.locator(".poster-v2-board");
  await expect(board).toBeVisible();
  // The board frame fades in as a function of scroll position; wait for the final value.
  await board.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY));
  await expect.poll(() => page.locator(".poster-v2-frame").evaluate(element =>
    element.style.getPropertyValue("--poster-v2-frame-opacity")
  ), { timeout: 5_000 }).toMatch(/^1(\.0+)?$/);
  await settleVisualPage(page);
  await board.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY));
  await settleFrames(page);
  await expect(page).toHaveScreenshot(`act-showcase-board-${theme}-${projectName}.png`, { fullPage: false });
}

for (const theme of ACT_THEMES) {
  test(`アクト紹介(豪華版) ${theme}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "visual-desktop" && theme !== "nova", "モバイルは nova のみ");
    test.setTimeout(90_000);
    await playSequence(page, theme, testInfo.project.name);
  });
}

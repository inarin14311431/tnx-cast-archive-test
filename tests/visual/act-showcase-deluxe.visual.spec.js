import { test, expect } from "@playwright/test";
import { settleVisualPage } from "./visual-fixtures.js";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes, installHeldActShowcaseRoutes, showcaseData } from "./act-showcase-fixtures.js";

// One capture per scene frame, named after the frame ids of docs/ACT_SHOWCASE_SCENES.md §6.1
// (loading / title / trailer / handout-assign / ready / finale), in their fixed order:
//
//   act-showcase-<frame>[-<state>]-<theme>-<project>.png
//
//   loading-static               the static loading screen, before the showcase data arrives (common to every pattern)
//   loading-access               the ACCESS screen (01 // ACT FILE // ACCESS), once the data has arrived
//   title, trailer               each screen once its NEXT button is shown
//   handout-assign-pcN-handout   the handout of PC N read out (the same section is then used for the assignment)
//   handout-assign-pcN-assign    the cast of PC N assigned
//   ready                        ACT READY, the summary (the code calls it "finale": .neotokyo-finale__*)
//   finale-hero, finale-board    the page itself after the sequence: the hero at the top, then the cast board
//
// The sequence advances only on the NEXT button. Its label names the step that has just finished, so each
// capture waits for a label instead of a timer.

// The ACCESS screen advances on its own after ACCESS_SCREEN_MS (js/act-showcase-neotokyo.js showOpening). Capturing it
// takes longer than that on a slow runner, so the screen could already have swapped to the title. Hold that one timer
// (matched by its duration) until the capture is done, then release it; every other timer runs as usual.
const ACCESS_SCREEN_MS = 2900;

async function holdAccessScreenTimer(page) {
  await page.addInitScript(duration => {
    const nativeSetTimeout = window.setTimeout;
    window.setTimeout = function (callback, delay, ...args) {
      if (delay !== duration || window.__releaseAccessScreen) return nativeSetTimeout.call(this, callback, delay, ...args);
      let released = false;
      const fire = () => {
        if (released) return;
        released = true;
        callback(...args);
      };
      window.__releaseAccessScreen = fire;
      return nativeSetTimeout.call(this, fire, 600_000);
    };
  }, ACCESS_SCREEN_MS);
}

const PC_NUMBERS = showcaseData.casts.map((_, index) => index + 1);
const pad = value => String(value).padStart(2, "0");

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

// Waits until the NEXT button shows `label`, captures, then clicks it.
async function captureAt(page, label, name) {
  const advance = page.locator(".neotokyo-sequence__advance");
  await expect(advance).toHaveText(label, { timeout: 15_000 });
  await expect(advance).toBeVisible();
  await capture(page, name);
  await advance.click({ force: true });
}

async function playSequence(page, theme, projectName) {
  const shot = frame => `act-showcase-${frame}-${theme}-${projectName}`;
  await installActShowcaseRoutes(page);
  await holdAccessScreenTimer(page);
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}`);
  await expect(page.locator("html")).toHaveAttribute("data-showcase-theme", theme);

  // loading: the ACCESS screen, held (see holdAccessScreenTimer) and captured once the access seal has finished its
  // own 620ms authorization transition; everything else on it is static copy.
  await expect(page.locator(".neotokyo-sequence__screen--opening")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".neotokyo-sequence__access-seal")).toHaveClass(/is-authorized/, { timeout: 5_000 });
  await capture(page, shot("loading-access"));
  await expect(page.locator(".neotokyo-sequence__screen--opening")).toBeVisible();
  await page.evaluate(() => window.__releaseAccessScreen?.());

  await captureAt(page, "NEXT // ACT TRAILER", shot("title"));
  await captureAt(page, "NEXT // HANDOUT 01", shot("trailer"));

  // handout-assign: one section per PC, the handout first, then the assignment in the same section.
  for (const pc of PC_NUMBERS) {
    await captureAt(page, `ASSIGN // PC${pc}`, shot(`handout-assign-pc${pc}-handout`));
    const next = pc < PC_NUMBERS.length ? `NEXT // HANDOUT ${pad(pc + 1)}` : "NEXT // ACT SUMMARY";
    await captureAt(page, next, shot(`handout-assign-pc${pc}-assign`));
  }

  // ready: the NEXT button is replaced by the access button in the footer.
  const access = page.locator(".neotokyo-finale__access-button");
  await expect(access).toBeVisible({ timeout: 15_000 });
  await capture(page, shot("ready"));
  await access.click({ force: true });

  // finale: the sequence overlay is removed (850ms after it starts to hide), leaving the page at the top.
  await expect(page.locator("#cinematic-intro")).toHaveCount(0, { timeout: 8_000 });
  const board = page.locator(".poster-v2-board");
  await expect(board).toBeVisible();
  await capture(page, shot("finale-hero"));

  // The cast frame fades in as a function of scroll position; scroll to it and wait for the final value.
  // The frame is transformed by that same scroll-linked value, so its rect moves while it fades in.
  // Re-measure after every settled frame until the frame top sits at the viewport top.
  const frame = page.locator(".poster-v2-frame");
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await settleFrames(page);
    const top = await frame.evaluate(element => element.getBoundingClientRect().top);
    if (Math.abs(top) < 1) break;
    await page.evaluate(delta => window.scrollBy(0, delta), top);
  }
  await expect.poll(() => frame.evaluate(element =>
    element.style.getPropertyValue("--poster-v2-frame-opacity")
  ), { timeout: 5_000 }).toMatch(/^1(\.0+)?$/);
  await settleFrames(page);
  expect(Math.abs(await frame.evaluate(element => element.getBoundingClientRect().top))).toBeLessThan(1);
  // The cast visual (image + caption) is compared too: the caption is built once in its final form by
  // act-showcase-page.js, so what is on screen no longer depends on observer order.
  await expect(page).toHaveScreenshot(`${shot("finale-board")}.png`, { fullPage: false });
}

for (const theme of ACT_THEMES) {
  test(`アクト紹介(豪華版) ${theme}`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await playSequence(page, theme, testInfo.project.name);
  });
}

// loading-static: shown while the showcase data is still being fetched. The RPC is held so the screen stays up.
for (const theme of ACT_THEMES) {
  test(`アクト紹介(豪華版・読み込み中) ${theme}`, async ({ page }, testInfo) => {
    const release = await installHeldActShowcaseRoutes(page);
    await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}`);
    await expect(page.locator(".cinematic-intro__title")).toHaveText("ACT FILE // ACCESS");
    await expect(page.locator(".cinematic-intro__sub")).toHaveText("CONNECTING TO PUBLIC ACT FILE…");
    await capture(page, `act-showcase-loading-static-${theme}-${testInfo.project.name}`);
    release();
  });
}

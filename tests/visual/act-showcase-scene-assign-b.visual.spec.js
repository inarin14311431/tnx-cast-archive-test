import { test, expect } from "@playwright/test";
import { settleVisualPage } from "./visual-fixtures.js";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes, showcaseData } from "./act-showcase-fixtures.js";

// Pattern B of the HANDOUT / ASSIGN frame (docs/ACT_SHOWCASE_SCENES.md §6 #7, 4th pattern), the first PC, in two states of the screen:
//
//   act-showcase-assign-b-<state>[-long]-<theme>-<project>.png
//
//   read    the handout has been read (data-phase="read"): the round slot is empty, the name and the cards wait
//   assigned  the assignment is complete (data-phase="assigned", data-flip="done"): the face, the name and the cards are in
//   (-long) the longest handle and name, a long handout text, three long style names; nova only
//
// The screen has two state attributes, data-phase and data-flip, and this spec waits on them: no shot is taken after a fixed time.
// The spec skips itself while the page under test does not offer pattern "b" for the handout-assign frame yet, so this file can be
// merged before the pattern itself and never turns other pull requests red; the images are made as docs/TESTING_STRATEGY.md section 8 says.
const LONG_NAME = "“夜明けを駆け抜けるネオンの亡霊と呼ばれた伝説のランナー” 神楽坂 ALEXANDER VON NEON 零式 ミドルネーム付き";
const LONG_BODY = `推奨スタイル：カブキ\nコネ：千早雅之　推奨スート：情熱\n${"消えたデータの痕跡を追う運び屋として、事件の渦中に巻き込まれる。".repeat(14)}`;
const longCasts = () => showcaseData.casts.map((cast, index) => index === 0
  ? {
      ...cast,
      fullName: LONG_NAME,
      tagline: "とても長い一言とても長い一言とても長い一言とても長い一言",
      handout: { ...cast.handout, body: LONG_BODY },
      styles: [{ label: "とても長いスタイル名の組み合わせ◎", handoutRole: true }, { label: "もう一つの長いスタイル名●", handoutRole: false }, { label: "ニューロ", handoutRole: false }]
    }
  : cast);

async function pageOffersAssignB(page) {
  // A script URL is a document of the same origin: nothing of the showcase page runs, and import() can read the module.
  await page.goto("/js/act-showcase-scenes.js");
  return page.evaluate(async () => {
    try {
      const { SCENE_PATTERNS } = await import("/js/act-showcase-scenes.js");
      return Boolean(SCENE_PATTERNS["handout-assign"]?.includes("b"));
    } catch {
      return false;
    }
  });
}

// Walks the footer button to the first handout, then waits for the handout to be read.
async function playToRead(page, theme, options) {
  await installActShowcaseRoutes(page, { scenes: { "handout-assign": "b" }, ...options });
  // flip=fast: the cards turn quickly, so the walk is short (the compare jobs have 25 minutes)
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}&flip=fast`);
  await expect(page.locator("html")).toHaveAttribute("data-showcase-theme", theme);
  const advance = page.locator(".neotokyo-sequence__advance");
  for (let step = 0; step < 8; step += 1) {
    await expect(advance).toBeVisible({ timeout: 20_000 });
    const label = ((await advance.textContent()) || "").trim();
    if (label.startsWith("ASSIGN")) break;
    await advance.click({ force: true });
    await expect.poll(async () => ((await advance.textContent()) || "").trim() !== label || !(await advance.isVisible()), { timeout: 15_000 }).toBe(true);
  }
  const screen = page.locator('.neotokyo-sequence__screen[data-scene="handout-assign"]');
  await expect(screen).toHaveAttribute("data-scene-pattern", "b");
  await expect(screen).toHaveAttribute("data-phase", "read");
  return advance;
}

// The end state of the screen, in the page's own terms: the phase and the card turn are done, the face, the name and the cards have
// finished fading in, and the screen has stopped scrolling.
async function waitForAssigned(page) {
  const screen = page.locator('.neotokyo-assign-b[data-phase="assigned"][data-flip="done"]');
  await expect(screen).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => [".neotokyo-assign-b__portrait", ".neotokyo-assign-b__who", ".neotokyo-assign-b__cards"].map(selector => getComputedStyle(document.querySelector(selector)).opacity).join()), { timeout: 10_000 }).toBe("1,1,1");
  await page.evaluate(() => new Promise(resolve => {
    const screen = document.querySelector(".neotokyo-assign-b");
    let last = -1;
    let still = 0;
    const tick = () => {
      still = screen.scrollTop === last ? still + 1 : 0;
      last = screen.scrollTop;
      return still >= 5 ? resolve() : requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
}

async function capture(page, name) {
  await settleVisualPage(page);
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: false });
}

for (const theme of ACT_THEMES) {
  test(`アクト紹介(豪華版・handout-assign B) ${theme}`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    test.skip(!(await pageOffersAssignB(page)), "pattern B of the handout-assign frame is not in this build yet");
    const advance = await playToRead(page, theme);
    await capture(page, `act-showcase-assign-b-read-${theme}-${testInfo.project.name}`);
    await advance.click({ force: true });
    await waitForAssigned(page);
    await capture(page, `act-showcase-assign-b-assigned-${theme}-${testInfo.project.name}`);
  });
}

test("アクト紹介(豪華版・handout-assign B・最長のハンドルと名前・長い本文) nova", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!(await pageOffersAssignB(page)), "pattern B of the handout-assign frame is not in this build yet");
  const advance = await playToRead(page, "nova", { casts: longCasts() });
  await capture(page, `act-showcase-assign-b-read-long-nova-${testInfo.project.name}`);
  await advance.click({ force: true });
  await waitForAssigned(page);
  await capture(page, `act-showcase-assign-b-assigned-long-nova-${testInfo.project.name}`);
});

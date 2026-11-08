import { test, expect } from "@playwright/test";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes, showcaseData } from "./fixtures/act-showcase-data.js";
import { DECORATIVE_SELECTORS, formatFailure, measureContrast } from "./fixtures/act-showcase-contrast.js";

// docs/ACT_SHOWCASE_SCENES.md §6 #7 (6th pattern: loading): LOADING pattern B, the boot terminal. A showcase whose composition says { loading: "b" } plays it as the ACCESS
// screen once the data has arrived; everything else plays pattern A. B uses class names of its own, so the layer that decorates pattern A's ACCESS screen (the access
// seal, is-cinematic-access) finds nothing. The static loading screen before the data arrives is common to every pattern and is not part of this file.
const withScenes = (scenes, extra = {}) => ({ ...showcaseData, scenes, ...extra });
const writerData = withScenes({ loading: "b" }, { scenarioWriterName: "脚本 太郎", rulerName: "VISUAL RULER" });
const B = ".neotokyo-loading-b";
const LOADING = '.neotokyo-sequence__screen[data-scene="loading"]';
const A_HOOKS = [".neotokyo-sequence__screen--opening", ".neotokyo-sequence__bootlog", ".neotokyo-sequence__access-seal", ".is-cinematic-access", ".neotokyo-sequence__opening-title", ".neotokyo-sequence__opening-sub"];
const LONG = "“夜明けを駆け抜けるネオンの亡霊” 神楽坂 ALEXANDER VON NEON 零式";
const casts = count => Array.from({ length: count }, (_, index) => ({ ...showcaseData.casts[index % 3], fullName: index % 2 ? LONG : "“ル” 名" }));
const handleOf = fullName => `“${fullName.match(/^[“"「『]([^”"」』]+)[”"」』]/)[1]}”`;

// Holds the one timer that moves the screen on (matched by its duration), so a screen can be measured for as long as needed; release() lets it go.
async function holdTimer(page, duration) {
  await page.addInitScript(held => {
    const nativeSetTimeout = window.setTimeout;
    window.setTimeout = function (callback, delay, ...args) {
      if (delay !== held || window.__releaseScreen) return nativeSetTimeout.call(this, callback, delay, ...args);
      let released = false;
      const fire = () => { if (!released) { released = true; callback(...args); } };
      window.__releaseScreen = fire;
      return nativeSetTimeout.call(this, fire, 600_000);
    };
  }, duration);
}

async function open(page, data, { theme = "nova", reduced = false, hold = false, route } = {}) {
  await installActShowcaseRoutes(page, data);
  if (route) await route();
  if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  if (hold) await holdTimer(page, 2900);
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}`);
}

// When each screen of the sequence became visible (ms since the page started), recorded in the page.
async function recordScreens(page) {
  await page.addInitScript(() => {
    window.__screens = [];
    addEventListener("DOMContentLoaded", () => {
      new MutationObserver(records => {
        for (const record of records) {
          const target = record.target;
          if (record.type === "attributes" && target.matches?.(".neotokyo-sequence__screen") && target.classList.contains("is-visible") && !(record.oldValue || "").includes("is-visible")) {
            window.__screens.push([target.dataset.scene, target.dataset.scenePattern, Math.round(performance.now())]);
          }
        }
      }).observe(document.querySelector("#cinematic-intro"), { subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true });
    });
  });
}
const screens = page => page.evaluate(() => window.__screens);

test("B を選ぶと B の画面が出て、A の後付けの層が探すもの(ACCESS の印・is-cinematic-access など)は無く、ログは実データから、そのあと title へ自動で進む", async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, writerData);
  const screen = page.locator(LOADING);
  await expect(screen).toHaveAttribute("data-scene-pattern", "b", { timeout: 20_000 });
  await expect(page.locator(B)).toHaveCount(1);
  await expect(page.locator(".cinematic-intro__inner")).toHaveCount(0);
  for (const hook of A_HOOKS) await expect(page.locator(hook), hook).toHaveCount(0);
  await expect(page.locator(`${B}__granted`)).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(`${B}__granted`)).toHaveText("ACCESS GRANTED");
  const expected = [
    "handshake ... ok",
    `act file ${ACT_SLUG} located`,
    `act: ${showcaseData.actName}`,
    "theme: NEON GRID",
    "ruler: VISUAL RULER",
    "scenario writer: 脚本 太郎",
    ...showcaseData.casts.map((cast, index) => `PC${index + 1} ${handleOf(cast.fullName)} linked`),
    "guest files: 1",
    "decrypt ... done"
  ];
  await expect(page.locator(`${B}__line:not([hidden])`)).toHaveText(expected);
  // the sequence goes on by itself: the title screen follows, and the terminal is gone
  await expect(page.locator('.neotokyo-sequence__screen[data-scene="title"]')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(B)).toHaveCount(0);
});

test("scenes が無い(既存の公開アクト)・A を指定したときは、今までどおり A の ACCESS 画面", async ({ page }) => {
  test.setTimeout(60_000);
  for (const data of [showcaseData, withScenes({ loading: "a" })]) {
    await open(page, data);
    const screen = page.locator(LOADING);
    await expect(screen).toHaveAttribute("data-scene-pattern", "a", { timeout: 20_000 });
    await expect(screen).toHaveClass(/neotokyo-sequence__screen--opening/);
    await expect(page.locator(".neotokyo-sequence__bootlog")).toHaveCount(1);
    await expect(page.locator(".neotokyo-sequence__access-seal")).toHaveCount(1);
    await expect(page.locator(B)).toHaveCount(0);
  }
});

test("B の画面を作れなければ、その枠は A で再生され、先へ進める", async ({ page }) => {
  test.setTimeout(60_000);
  const warnings = [];
  page.on("console", message => { if (message.type() === "warning") warnings.push(message.text()); });
  await open(page, writerData, {
    route: () => page.route("**/js/act-showcase-loading-b.js*", route => route.fulfill({
      contentType: "text/javascript",
      body: 'export const MAX_PCS = 6;\nexport function bootLines() { return []; }\nexport function createLoadingScreenB() { throw new Error("pattern B is broken"); }'
    }))
  });
  const screen = page.locator(LOADING);
  await expect(screen).toHaveAttribute("data-scene-pattern", "a", { timeout: 20_000 });
  await expect(screen).toHaveClass(/neotokyo-sequence__screen--opening/);
  await expect(page.locator(B)).toHaveCount(0);
  expect(warnings.some(text => text.includes('scene "loading" pattern "b" failed'))).toBe(true);
  await expect(page.locator('.neotokyo-sequence__screen[data-scene="title"]')).toBeVisible({ timeout: 10_000 });
});

test("ゲストの取得に失敗しても B は出て、guest files の行だけが無い", async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, writerData, {
    reduced: true,
    hold: true,
    route: () => page.route("**/rest/v1/rpc/get_public_act_showcase_guests", route => route.fulfill({ status: 500, headers: { "access-control-allow-origin": "*", "content-type": "application/json" }, body: "{}" }))
  });
  await expect(page.locator(LOADING)).toHaveAttribute("data-scene-pattern", "b", { timeout: 20_000 });
  await expect(page.locator(`${B}__granted`)).toBeVisible();
  const lines = await page.locator(`${B}__line:not([hidden])`).allTextContents();
  expect(lines.some(text => text.startsWith("guest files"))).toBe(false);
  expect(lines.at(-1)).toBe("decrypt ... done");
  await page.evaluate(() => window.__releaseScreen?.());
});

test("長さは A より 1 秒以内しか長くない(同じ環境で A と B を続けて測る)。reduced-motion は打鍵せず、A と同じ長さ", async ({ page }) => {
  test.setTimeout(90_000);
  const lengthOf = async (data, options = {}) => {
    await recordScreens(page);
    await open(page, data, options);
    await expect.poll(async () => (await screens(page)).some(([scene]) => scene === "title"), { timeout: 20_000 }).toBe(true);
    const list = await screens(page);
    return list.find(([scene]) => scene === "title")[2] - list.find(([scene]) => scene === "loading")[2];
  };
  const a = await lengthOf(showcaseData);
  const b = await lengthOf(withScenes({ loading: "b" }, { casts: casts(6) }));
  // pattern A holds 2.9 s; B types about 2.2 s and holds 1.2 s. The margin is for the scheduling of a loaded runner
  expect(a).toBeGreaterThan(2700);
  expect(b).toBeLessThanOrEqual(a + 1000 + 250);
  expect(b).toBeGreaterThan(2500);
  const reduced = await lengthOf(withScenes({ loading: "b" }, { casts: casts(6) }), { reduced: true });
  expect(Math.abs(reduced - a)).toBeLessThan(400);
});

test("reduced-motion では打鍵せず、全行と ACCESS GRANTED が最初から出る", async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, writerData, { reduced: true, hold: true });
  await expect(page.locator(LOADING)).toHaveAttribute("data-scene-pattern", "b", { timeout: 20_000 });
  await expect(page.locator(`${B}__granted`)).toBeVisible();
  await expect(page.locator(`${B}__line[hidden]`)).toHaveCount(0);
  await expect(page.locator(`${B}__line[data-typing]`)).toHaveCount(0);
  await page.evaluate(() => window.__releaseScreen?.());
});

test("SKIP SEQUENCE は打鍵の途中でも効く", async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, writerData);
  await expect(page.locator(`${B}__line:not([hidden])`).first()).toBeVisible({ timeout: 20_000 });
  await page.locator(".neotokyo-sequence__skip").click({ force: true });
  await expect(page.locator("#cinematic-intro")).toHaveCount(0, { timeout: 8_000 });
});

test("打鍵の途中も、キャレットは端末の枠の中(1440x900・390x844・844x390、6人・長いハンドル)", async ({ page }) => {
  test.setTimeout(120_000);
  for (const [width, height] of [[1440, 900], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => {
      window.__caret = { samples: 0, outside: 0 };
      const sample = () => {
        const row = document.querySelector(".neotokyo-loading-b__line[data-typing]");
        const log = document.querySelector(".neotokyo-loading-b__log");
        const text = row && [...row.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
        if (row && log && text && text.length) {
          const range = document.createRange();
          range.setStart(text, text.length - 1);
          range.setEnd(text, text.length);
          const rect = [...range.getClientRects()].at(-1);
          const box = log.getBoundingClientRect();
          if (rect) {
            window.__caret.samples += 1;
            if (rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1) window.__caret.outside += 1;
          }
        }
        requestAnimationFrame(sample);
      };
      addEventListener("DOMContentLoaded", () => requestAnimationFrame(sample));
    });
    await open(page, withScenes({ loading: "b" }, { casts: casts(6), scenarioWriterName: "とても長い名前の脚本家 ALEXANDER VON NEON" }));
    await expect(page.locator(`${B}__granted`)).toBeVisible({ timeout: 20_000 });
    const caret = await page.evaluate(() => window.__caret);
    const at = `${width}x${height}`;
    expect(caret.samples, at).toBeGreaterThan(20);
    expect(caret.outside, at).toBe(0);
    await page.goto("about:blank");
  }
});

test("1・3・6人でも、はみ出さず、端末はステージいっぱいで、最後の ACCESS GRANTED まで枠に入る(1440x900・1024x768・390x844・360x640・844x390)", async ({ page }) => {
  test.setTimeout(180_000);
  for (const count of [1, 3, 6]) {
    await open(page, withScenes({ loading: "b" }, { casts: casts(count), scenarioWriterName: "とても長い名前の脚本家 ALEXANDER VON NEON" }), { reduced: true, hold: true });
    await expect(page.locator(`${B}__granted`)).toBeVisible({ timeout: 20_000 });
    for (const [width, height] of [[1440, 900], [1024, 768], [390, 844], [360, 640], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(400);
      const fit = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect();
        const screen = rect(".neotokyo-loading-b");
        const stage = rect(".neotokyo-sequence__stage");
        const log = rect(".neotokyo-loading-b__log");
        const granted = rect(".neotokyo-loading-b__granted");
        const lines = [...document.querySelectorAll(".neotokyo-loading-b__line:not([hidden])")];
        const last = lines.at(-1).getBoundingClientRect();
        return {
          horizontal: document.documentElement.scrollWidth - innerWidth,
          sideways: document.querySelector(".neotokyo-loading-b__log").scrollWidth - document.querySelector(".neotokyo-loading-b__log").clientWidth,
          coversStage: Math.abs(screen.left - stage.left) <= 1 && Math.abs(screen.top - stage.top) <= 1 && Math.abs(screen.right - stage.right) <= 1 && Math.abs(screen.bottom - stage.bottom) <= 1,
          linesInside: lines.every(line => line.getBoundingClientRect().left >= log.left - 1 && line.getBoundingClientRect().right <= log.right + 1),
          grantedInside: granted.left >= log.left - 1 && granted.right <= log.right + 1 && granted.top >= log.top - 1 && granted.bottom <= log.bottom + 1,
          lastLineInside: last.top >= log.top - 1 && last.bottom <= log.bottom + 1,
          footer: rect(".neotokyo-sequence__footer").bottom - innerHeight,
          lines: lines.length
        };
      });
      const at = `${count} PC, ${width}x${height}`;
      expect(fit.horizontal, at).toBeLessThanOrEqual(0);
      expect(fit.sideways, at).toBeLessThanOrEqual(0);
      expect(fit.coversStage, at).toBe(true);
      expect(fit.linesInside, at).toBe(true);
      expect(fit.grantedInside, at).toBe(true);
      expect(fit.lastLineInside, at).toBe(true);
      expect(fit.footer, at).toBeLessThanOrEqual(1);
    }
    await page.evaluate(() => window.__releaseScreen?.());
    await page.goto("about:blank");
  }
});

// The contrast is measured on desktop, then after the window is resized to a phone (390x844), with the whole log shown.
for (const theme of ACT_THEMES) {
  test(`B の文字コントラスト(PC幅・phone幅) ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await open(page, writerData, { theme, reduced: true, hold: true });
    await expect(page.locator(`${B}__granted`)).toBeVisible({ timeout: 20_000 });
    for (const [width, height] of [[1440, 1000], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(900);
      // the shared header ("MUNICIPAL DATABASE", 2.73:1 on intron at 390 wide) is the same on every frame and pattern: a known issue of its own, not measured here
      const result = await measureContrast(page, { excluded: [...DECORATIVE_SELECTORS, ".neotokyo-sequence__header"] });
      expect(result.items.length, `${width}x${height}`).toBeGreaterThan(8);
      expect(result.failures.map(formatFailure), `${width}x${height}`).toEqual([]);
    }
    await page.evaluate(() => window.__releaseScreen?.());
  });
}

import { test, expect } from "@playwright/test";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes, showcaseData } from "./fixtures/act-showcase-data.js";
import { DECORATIVE_SELECTORS, formatFailure, measureContrast } from "./fixtures/act-showcase-contrast.js";

// docs/ACT_SHOWCASE_SCENES.md §6 #7: ACT TRAILER pattern B (vertical text). A showcase whose composition says
// { trailer: "b" } plays it; everything else plays pattern A. B uses class names of its own, so none of pattern A's
// decorations (terminal window, outro, page scroll) reach it, and when drawing B fails the frame is played as A.
const withScenes = (scenes, trailerBody) => ({
  ...showcaseData,
  scenes,
  ...(trailerBody ? { trailer: { ...showcaseData.trailer, body: trailerBody } } : {})
});
const LONG_TRAILER = [
  "夜のN◎VAに未明の警報が響く。消えたデータの痕跡を追い、三人のキャストが動き出す。",
  "雨に濡れた高架の下、旧式のデッキが最後の通信を吐き出した。差出人は三年前に死んだはずの情報屋。",
  "手がかりは暗号化された座標と、都市の誰もが知っている童謡の一節だけだった。",
  "企業の監視網をすり抜け、地下の闇市を抜け、夜明けまでに真実へ辿り着けるのか。",
  "選ばれた者たちの長い一夜が、いま静かに幕を開ける。"
].join("\n");
const TRAILER_SCREEN = '.neotokyo-sequence__screen[data-scene="trailer"]';

async function openTrailer(page, data, theme = "nova") {
  await installActShowcaseRoutes(page, data);
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}`);
  const advance = page.locator(".neotokyo-sequence__advance");
  await expect(advance).toHaveText("NEXT // ACT TRAILER", { timeout: 20_000 });
  await advance.click({ force: true });
  await expect(page.locator(TRAILER_SCREEN)).toBeVisible({ timeout: 10_000 });
  return advance;
}

// While the text is typed, the caret (the last character already read) must stay inside the box that scrolls it.
async function sampleCaretWhileTyping(page) {
  return page.evaluate(() => new Promise(resolve => {
    const samples = [];
    const start = performance.now();
    const tick = () => {
      const copy = document.querySelector(".neotokyo-trailer-b__copy");
      const box = document.querySelector(".neotokyo-trailer-b__body");
      const read = copy?.querySelector(".neotokyo-sequence__readout-read")?.firstChild;
      if (copy && box && read?.length) {
        const range = document.createRange();
        range.setStart(read, read.length - 1);
        range.setEnd(read, read.length);
        const rect = [...range.getClientRects()].filter(item => item.width > 0).at(-1);
        const bounds = box.getBoundingClientRect();
        if (rect) samples.push({ typing: copy.dataset.typing === "true", inside: rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1 && rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1 });
      }
      if (performance.now() - start > 6500) return resolve(samples);
      setTimeout(tick, 120);
    };
    tick();
  }));
}

test("B を選ぶと B の画面が出て、A の装飾(端末窓・outro・ページのスクロール)は付かない", async ({ page }) => {
  test.setTimeout(60_000);
  const advance = await openTrailer(page, withScenes({ trailer: "b" }));
  const screen = page.locator(TRAILER_SCREEN);
  await expect(screen).toHaveAttribute("data-scene-pattern", "b");
  await expect(advance).toHaveText("NEXT // HANDOUT 01", { timeout: 15_000 });
  await expect(screen).toHaveClass(/neotokyo-trailer-b/);
  await expect(screen).not.toHaveClass(/neotokyo-sequence__screen--trailer/);
  await expect(screen).not.toHaveAttribute("data-trailer-pattern", /.*/);
  await expect(page.locator(".neotokyo-sequence__trailer-terminal, .neotokyo-story__trailer-outro, .is-terminal-readout")).toHaveCount(0);
  await expect(page.locator(".neotokyo-sequence__stage")).not.toHaveClass(/is-trailer-scroll/);
  await expect(page.locator("body")).not.toHaveClass(/showcase-trailer-document-scroll/);
  // the whole text is read out, once, and the unread part is gone
  await expect(page.locator(".neotokyo-trailer-b__copy")).toHaveText(showcaseData.trailer.body.replace(/\r\n?/g, "\n"), { useInnerText: false });
  await expect(page.locator(".neotokyo-trailer-b__title")).toHaveText(showcaseData.trailer.title);
  // PC width: vertical text; the title stays horizontal
  expect(await page.locator(".neotokyo-trailer-b__copy").evaluate(element => getComputedStyle(element).writingMode)).toBe("vertical-rl");
  expect(await page.locator(".neotokyo-trailer-b__title").evaluate(element => getComputedStyle(element).writingMode)).toBe("horizontal-tb");
  // NEXT goes on to the handout as it does after pattern A
  await advance.click({ force: true });
  await expect(page.locator('.neotokyo-sequence__screen[data-scene="handout-assign"]')).toBeVisible({ timeout: 10_000 });
});

test("A を指定しても、scenes が無くても、A のまま(端末窓の画面)", async ({ page }) => {
  test.setTimeout(60_000);
  for (const data of [withScenes({ trailer: "a" }), showcaseData, withScenes({ trailer: "z" })]) {
    await openTrailer(page, data);
    const screen = page.locator(TRAILER_SCREEN);
    await expect(screen).toHaveAttribute("data-scene-pattern", "a");
    await expect(screen).toHaveClass(/neotokyo-sequence__screen--trailer/);
    await expect(page.locator(".neotokyo-trailer-b__copy")).toHaveCount(0);
  }
});

test("幅 760px 以下、または高さ 520px 以下では、見出しを上に積んだ横組みになる", async ({ page }) => {
  test.setTimeout(90_000);
  const cases = [
    { w: 1440, h: 1000, mode: "vertical-rl" },
    { w: 1024, h: 768, mode: "vertical-rl" },
    { w: 768, h: 1024, mode: "vertical-rl" },
    { w: 390, h: 844, mode: "horizontal-tb" },
    { w: 360, h: 640, mode: "horizontal-tb" },
    { w: 844, h: 390, mode: "horizontal-tb" }
  ];
  for (const { w, h, mode } of cases) {
    await page.setViewportSize({ width: w, height: h });
    await openTrailer(page, withScenes({ trailer: "b" }));
    const writing = await page.locator(".neotokyo-trailer-b__copy").evaluate(element => getComputedStyle(element).writingMode);
    expect(writing, `${w}x${h}`).toBe(mode);
    // nothing is cut off: the screen stays inside the stage
    const fits = await page.evaluate(() => {
      const screen = document.querySelector(".neotokyo-trailer-b").getBoundingClientRect();
      const stage = document.querySelector(".neotokyo-sequence__stage").getBoundingClientRect();
      return screen.left >= stage.left - 1 && screen.right <= stage.right + 1 && screen.top >= stage.top - 1 && screen.bottom <= stage.bottom + 1;
    });
    expect(fits, `${w}x${h} screen inside the stage`).toBe(true);
  }
});

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 360, height: 640 }, { width: 844, height: 390 }]) {
  test(`長文を打つ間、キャレットは枠の中にあり、読み終えた末尾も見える ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize(viewport);
    const advance = await openTrailer(page, withScenes({ trailer: "b" }, LONG_TRAILER));
    const samples = await sampleCaretWhileTyping(page);
    const typing = samples.filter(sample => sample.typing);
    expect(typing.length, "samples while typing").toBeGreaterThan(5);
    expect(typing.filter(sample => !sample.inside), "caret outside the box while typing").toEqual([]);
    await expect(advance).toHaveText("NEXT // HANDOUT 01", { timeout: 15_000 });
    const endInside = await page.evaluate(() => {
      const read = document.querySelector(".neotokyo-trailer-b__copy .neotokyo-sequence__readout-read").firstChild;
      const range = document.createRange();
      range.setStart(read, read.length - 1);
      range.setEnd(read, read.length);
      const rect = [...range.getClientRects()].filter(item => item.width > 0).at(-1);
      const box = document.querySelector(".neotokyo-trailer-b__body").getBoundingClientRect();
      return rect.left >= box.left - 1 && rect.right <= box.right + 1 && rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1;
    });
    expect(endInside, "the end of the text is in view once it is read").toBe(true);
  });
}

test("B の再生に失敗したら、その枠は A で再生され、先へ進める", async ({ page }) => {
  test.setTimeout(60_000);
  const warnings = [];
  page.on("console", message => { if (message.type() === "warning") warnings.push(message.text()); });
  // the module that builds screen B throws: the frame must not stay blank
  await page.route("**/js/act-showcase-trailer-b.js*", route => route.fulfill({
    contentType: "text/javascript",
    body: 'export function createTrailerScreenB() { throw new Error("pattern B is broken"); }'
  }));
  const advance = await openTrailer(page, withScenes({ trailer: "b" }));
  const screen = page.locator(TRAILER_SCREEN);
  await expect(screen).toHaveAttribute("data-scene-pattern", "a");
  await expect(screen).toHaveClass(/neotokyo-sequence__screen--trailer/);
  await expect(page.locator(".neotokyo-trailer-b")).toHaveCount(0);
  await expect(advance).toHaveText("NEXT // HANDOUT 01", { timeout: 15_000 });
  expect(warnings.some(text => text.includes('scene "trailer" pattern "b" failed'))).toBe(true);
  await advance.click({ force: true });
  await expect(page.locator('.neotokyo-sequence__screen[data-scene="handout-assign"]')).toBeVisible({ timeout: 10_000 });
});

test("forced-colors では装飾の大きな「03」を隠す", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ forcedColors: "active" });
  await openTrailer(page, withScenes({ trailer: "b" }));
  expect(await page.locator(".neotokyo-trailer-b__index").evaluate(element => getComputedStyle(element).display)).toBe("none");
  await page.emulateMedia({ forcedColors: "none" });
  expect(await page.locator(".neotokyo-trailer-b__index").evaluate(element => getComputedStyle(element).display)).not.toBe("none");
});

for (const theme of ACT_THEMES) {
  test(`B の文字コントラスト(PC幅) ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    const advance = await openTrailer(page, withScenes({ trailer: "b" }, LONG_TRAILER), theme);
    await expect(advance).toHaveText("NEXT // HANDOUT 01", { timeout: 15_000 });
    await page.waitForTimeout(400);
    // the big outlined "03" is decoration, not information
    const result = await measureContrast(page, { excluded: [...DECORATIVE_SELECTORS, ".neotokyo-trailer-b__index"] });
    expect(result.items.length).toBeGreaterThan(5);
    expect(result.failures.map(formatFailure)).toEqual([]);
  });
}

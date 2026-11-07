import { test, expect } from "@playwright/test";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes, showcaseData } from "./fixtures/act-showcase-data.js";
import { DECORATIVE_SELECTORS, formatFailure, measureContrast } from "./fixtures/act-showcase-contrast.js";

// docs/ACT_SHOWCASE_SCENES.md §6 #7 (5th pattern: finale): FINALE pattern B, the key visual. A showcase whose composition says { finale: "b" } plays it on the
// page after the sequence; everything else plays pattern A. B uses class names of its own, so none of pattern A's observers (the final ACT TRAILER, the guest
// section, the scenario-writer credit, the role emphasis, the text fitting) find anything to decorate or rewrite, and the final-trailer one does not stay on the
// document. The trailer, the guests and the credits are drawn by B itself, from the model.
const withScenes = (scenes, extra = {}) => ({ ...showcaseData, scenes, ...extra });
const writerData = withScenes({ finale: "b" }, { scenarioWriterName: "脚本 太郎", rulerName: "VISUAL RULER" });
const B = ".neotokyo-finale-b";
const A_HOOKS = ["#scene-opening", "#opening-act-name", "#opening-ruler", "#opening-scenario-writer", "#poster-showcase-board-v2", "#poster-final-act-trailer", "#poster-supporting-cast", ".poster-v2-frame", ".poster-v2-panel", ".opening-scroll"];

// Counts the MutationObservers that are watching the whole document (final-trailer's waits for a place that pattern B does not have).
async function watchDocumentObservers(page) {
  await page.addInitScript(() => {
    const live = new Set();
    const observe = MutationObserver.prototype.observe;
    const disconnect = MutationObserver.prototype.disconnect;
    MutationObserver.prototype.observe = function (target, options) {
      if (target === document.documentElement) live.add(this);
      return observe.call(this, target, options);
    };
    MutationObserver.prototype.disconnect = function () {
      live.delete(this);
      return disconnect.call(this);
    };
    window.__documentObservers = () => live.size;
  });
}

// Opens the page and skips the sequence: the finale is the page under the overlay, drawn before the sequence starts.
async function openFinale(page, data, { theme = "nova", route } = {}) {
  await installActShowcaseRoutes(page, data);
  if (route) await route();
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}`);
  const skip = page.locator(".neotokyo-sequence__skip");
  await expect(skip).toBeVisible({ timeout: 20_000 });
  await skip.click({ force: true });
  await expect(page.locator("#cinematic-intro")).toHaveCount(0, { timeout: 8_000 });
}

test("B を選ぶと B の画面が出て、A の観察層が探すもの(ヒーロー・最終ボード・ゲスト欄など)は無い", async ({ page }) => {
  test.setTimeout(60_000);
  await openFinale(page, writerData);
  await expect(page.locator("#act-showcase-root")).toHaveAttribute("data-scene-pattern", "b");
  await expect(page.locator(B)).toBeVisible();
  await expect(page.locator(`${B}__title`)).toHaveText(showcaseData.actName);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator(`${B}__band`)).toHaveCount(showcaseData.casts.length);
  await expect(page.locator(`${B}__cards ${B}__card`)).toHaveCount(showcaseData.casts.length);
  // the shared shell stays: the ambient stage and the footer are drawn
  await expect(page.locator(".ambient-stage")).toHaveCount(1);
  await expect(page.locator("footer.footer")).toHaveCount(1);
  // let pattern A's observers run, then check that none of them found anything
  await page.waitForTimeout(1500);
  for (const selector of A_HOOKS) await expect(page.locator(selector), selector).toHaveCount(0);
});

test("トレーラー・ゲスト・クレジット(RULER・SCENARIO WRITER・CAST)は B が自分で描く。順番は、ヒーロー・クレジット・トレーラー・カード・ゲスト", async ({ page }) => {
  test.setTimeout(60_000);
  await openFinale(page, writerData);
  const credits = page.locator(`${B}__credit`);
  await expect(credits).toHaveCount(3);
  await expect(credits.nth(0)).toContainText("RULER");
  await expect(credits.nth(0)).toContainText("VISUAL RULER");
  await expect(credits.nth(1)).toContainText("SCENARIO WRITER");
  await expect(credits.nth(1)).toContainText("脚本 太郎");
  await expect(credits.nth(2)).toContainText("CAST");
  for (const cast of showcaseData.casts) await expect(credits.nth(2)).toContainText(cast.fullName.replace(/[“”]/g, "").split(" ").pop());
  await expect(page.locator(`${B}__trailer`)).toContainText(showcaseData.trailer.title);
  await expect(page.locator(`${B}__trailer-body`)).toContainText("消えたデータの痕跡を追い");
  await expect(page.locator(`${B}__guests`)).toContainText("GUEST CAST");
  // one card per guest, with what was registered for the guest (the fixture's age and gender are only "—", so they are left out)
  const guest = page.locator(`${B}__guests ${B}__card--guest`);
  await expect(guest).toHaveCount(1);
  await expect(guest.locator(`${B}__slot`)).toHaveText("GUEST 01");
  await expect(guest.locator(`${B}__handle`)).toHaveText("“ゲスト”");
  await expect(guest.locator(`${B}__real`)).toHaveText("協力者 K");
  await expect(guest.locator(`${B}__style`)).toHaveText(["トーキー◎"]);
  await expect(guest.locator(`${B}__meta-label`)).toHaveText(["AFFILIATION"]);
  await expect(guest.locator(`${B}__meta-value`)).toHaveText(["N◎VA市政調査局"]);
  await expect(guest.locator(`${B}__tagline`)).toHaveText("SUPPORTING");
  await expect(guest.locator(`${B}__guest-summary`)).toHaveText("アクトを支える協力者。");
  // the fixture's guest has no image: no portrait, never the placeholder picture
  await expect(guest.locator("img")).toHaveCount(0);
  // a single guest keeps the width of a cast card instead of spanning the page
  const guestWidth = (await guest.boundingBox()).width;
  const castWidth = (await page.locator(`${B}__cards ${B}__card`).first().boundingBox()).width;
  expect(Math.abs(guestWidth - castWidth)).toBeLessThanOrEqual(2);
  const tops = await page.evaluate(selectors => selectors.map(selector => document.querySelector(selector).getBoundingClientRect().top + scrollY), [`${B}__hero`, `${B}__credits`, `${B}__trailer`, `${B}__cards`, `${B}__guests`]);
  expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  expect(new Set(tops).size).toBe(5);
  // the hero is first: the credits strip is directly under it
  const hero = await page.locator(`${B}__hero`).boundingBox();
  const strip = await page.locator(`${B}__credits`).boundingBox();
  expect(Math.abs(strip.y - (hero.y + hero.height))).toBeLessThanOrEqual(1);
});

test("キャストごとのカードに、そのキャストのハンドアウトが出る。本文が空かプレースホルダなら出さない", async ({ page }) => {
  test.setTimeout(60_000);
  const casts = showcaseData.casts.map((cast, index) => index === 1
    ? { ...cast, handout: { title: "x", body: "ハンドアウト詳細は未登録です。" } }
    : index === 2
      ? { ...cast, handout: { title: "『カゼ』用ハンドアウト", body: "推奨スタイル：カゼ\nコネ：誰か" } }
      : cast);
  await openFinale(page, withScenes({ finale: "b" }, { casts }));
  const cards = page.locator(`${B}__cards ${B}__card`);
  await expect(cards.nth(0).locator(`${B}__handout-body`)).toContainText(showcaseData.casts[0].handout.body.split("\n")[0]);
  await expect(cards.nth(1).locator(`${B}__handout`)).toHaveCount(0);
  await expect(cards.nth(2).locator(`${B}__handout-title`)).toHaveText("『カゼ』用ハンドアウト");
  await expect(cards.nth(2).locator(`${B}__handout-body`)).toContainText("コネ：誰か");
  // the handle and the name are side by side while they fit (one line), in two parts
  const name = cards.nth(0).locator(`${B}__name`);
  await expect(name.locator(`${B}__handle`)).toHaveCount(1);
  await expect(name.locator(`${B}__real`)).toHaveCount(1);
});

test("B のページは、後から書き換えられない。final-trailer の observer も、文書全体に残らない(A は置いたあと外れる)", async ({ page }) => {
  test.setTimeout(60_000);
  await watchDocumentObservers(page);
  await openFinale(page, writerData);
  const before = await page.locator(B).evaluate(element => element.outerHTML);
  await page.waitForTimeout(2500);
  expect(await page.locator(B).evaluate(element => element.outerHTML)).toBe(before);
  expect(await page.evaluate(() => window.__documentObservers())).toBe(0);
  // the control: pattern A puts the trailer in and lets go of the observer
  const control = await page.context().newPage();
  await watchDocumentObservers(control);
  await openFinale(control, withScenes({ finale: "a" }));
  await expect(control.locator("#poster-final-act-trailer")).toHaveCount(1);
  expect(await control.evaluate(() => window.__documentObservers())).toBe(0);
});

test("A を指定しても、scenes が無くても、A のまま(ヒーロー・最終ボード・最終トレーラー)", async ({ page }) => {
  test.setTimeout(90_000);
  for (const data of [withScenes({ finale: "a" }), { ...showcaseData, scenes: undefined }]) {
    await openFinale(page, data);
    await expect(page.locator("#act-showcase-root")).toHaveAttribute("data-scene-pattern", "a");
    await expect(page.locator(B)).toHaveCount(0);
    await expect(page.locator("#scene-opening")).toHaveCount(1);
    await expect(page.locator("#poster-showcase-board-v2")).toHaveCount(1);
    await expect(page.locator("#poster-final-act-trailer")).toHaveCount(1, { timeout: 5_000 });
  }
});

test("B の再生に失敗したら、ページは A で出る(静的なページを途中まで書き換えていない)", async ({ page }) => {
  test.setTimeout(60_000);
  const warnings = [];
  page.on("console", message => { if (message.type() === "warning") warnings.push(message.text()); });
  await openFinale(page, writerData, {
    route: () => page.route("**/js/act-showcase-finale-b.js*", route => route.fulfill({
      contentType: "text/javascript",
      body: 'export function createFinaleB() { throw new Error("pattern B is broken"); }'
    }))
  });
  await expect(page.locator("#act-showcase-root")).toHaveAttribute("data-scene-pattern", "a");
  await expect(page.locator(B)).toHaveCount(0);
  await expect(page.locator("#poster-showcase-board-v2")).toHaveCount(1);
  await expect(page.locator("#opening-act-name")).toHaveText(showcaseData.actName);
  await expect(page.locator("#poster-final-act-trailer")).toHaveCount(1, { timeout: 5_000 });
  expect(warnings.some(text => text.includes('scene "finale" pattern "b" failed'))).toBe(true);
});

test("画像の無いキャストの帯は、代替の写真ではなく、テーマ色の面とハンドル。画像が読み込めなくても同じ", async ({ page }) => {
  test.setTimeout(60_000);
  const casts = [
    { ...showcaseData.casts[0], imageUrl: "" },
    { ...showcaseData.casts[1], imageUrl: "https://img.invalid/missing.png" },
    showcaseData.casts[2]
  ];
  await openFinale(page, withScenes({ finale: "b" }, { casts }), { route: () => page.route("https://img.invalid/**", route => route.abort()) });
  const bands = page.locator(`${B}__band`);
  await expect(bands.nth(0).locator(`${B}__band-fallback`)).toHaveText("“ブルー・モーメント”");
  await expect(bands.nth(1).locator(`${B}__band-fallback`)).toHaveCount(1, { timeout: 5_000 });
  await expect(bands.nth(2).locator("img")).toHaveCount(1);
  await expect(page.locator(`${B} img[src*="scan-failed"]`)).toHaveCount(0);
  // the plain bands keep their size: the three bands are the same width apart
  const lefts = await bands.evaluateAll(items => items.map(item => item.getBoundingClientRect().left));
  expect(Math.abs((lefts[1] - lefts[0]) - (lefts[2] - lefts[1]))).toBeLessThanOrEqual(2);
});

test("立ち絵は、保存済みの位置・拡大を使わず、上寄せ 50% 6% の固定", async ({ page }) => {
  test.setTimeout(60_000);
  await openFinale(page, writerData);
  const state = await page.locator(`${B}__band-image`).first().evaluate(image => ({
    inline: image.getAttribute("style"),
    position: getComputedStyle(image).objectPosition,
    fit: getComputedStyle(image).objectFit,
    transform: getComputedStyle(image).transform
  }));
  expect(state.inline).toBeNull();
  expect(state.fit).toBe("cover");
  expect(state.position).toBe("50% 6%");
  expect(state.transform).toBe("none");
});

test("reduced-motion では、フェードインを付けず、最終の状態をすぐ表示する", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openFinale(page, writerData);
  const state = await page.locator(B).evaluate(element => ({ animation: getComputedStyle(element).animationName, opacity: getComputedStyle(element).opacity }));
  expect(state).toEqual({ animation: "none", opacity: "1" });
});

// 1 to 6 casts, the longest names, at 1440x900, 1024x768, 390x844 (iPhone Safari), 360x640 (the narrowest Android) and 844x390 (a phone held sideways):
// nothing overflows sideways, the bands are the same distance apart in a row (on a phone one to three in a row, four 2 x 2, five 3 + 2, six 3 + 3),
// the act name and every card stay inside the window.
const LONG = "“夜明けを駆け抜けるネオンの亡霊” 神楽坂 ALEXANDER VON NEON 零式";
const castsOf = count => Array.from({ length: count }, (_, index) => ({ ...showcaseData.casts[index % 3], fullName: index % 2 ? LONG : "ル 名" }));
const LONG_ACT = "夜明けを駆け抜けるネオンの亡霊たちと、眠らない街のアクト ALEXANDER VON NEON";
for (const count of [1, 2, 3, 4, 5, 6]) {
  test(`${count}人: はみ出さず、帯が崩れず、名前もカードも読める(1440x900・1024x768・390x844・360x640・844x390)`, async ({ page }) => {
    test.setTimeout(90_000);
    await openFinale(page, withScenes({ finale: "b" }, { casts: castsOf(count), actName: LONG_ACT }));
    for (const [width, height] of [[1440, 900], [1024, 768], [390, 844], [360, 640], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(500);
      const fit = await page.evaluate(() => {
        const rect = element => element.getBoundingClientRect();
        const bands = [...document.querySelectorAll(".neotokyo-finale-b__band")];
        const rows = [...new Set(bands.map(band => Math.round(rect(band).top)))];
        const rowsOfBands = rows.map(top => bands.filter(band => Math.round(rect(band).top) === top));
        const spacing = rowsOfBands.map(row => row.slice(1).map((band, index) => rect(band).left - rect(row[index]).left));
        const title = document.querySelector(".neotokyo-finale-b__title");
        const hero = rect(document.querySelector(".neotokyo-finale-b__hero"));
        // every card, the guests' included, must stay inside the window; the count is of the cast cards only
        const cards = [...document.querySelectorAll(".neotokyo-finale-b__card")];
        const castCards = document.querySelectorAll(".neotokyo-finale-b__cards .neotokyo-finale-b__card");
        return {
          horizontal: document.documentElement.scrollWidth - innerWidth,
          bands: bands.length,
          rows: rows.length,
          perRow: rowsOfBands.map(row => row.length),
          spacing,
          heights: bands.map(band => Math.round(rect(band).height)),
          titleInside: title.scrollWidth <= title.clientWidth + 1 && rect(title).left >= hero.left - 1 && rect(title).right <= hero.right + 1,
          titleInHero: rect(title).top >= hero.top - 1 && rect(title).bottom <= hero.bottom + 1,
          cards: castCards.length,
          cardsInside: cards.every(card => rect(card).left >= -1 && rect(card).right <= innerWidth + 1),
          namesInside: [...document.querySelectorAll(".neotokyo-finale-b__name, .neotokyo-finale-b__handle, .neotokyo-finale-b__real")].every(item => item.scrollWidth <= item.clientWidth + 1)
        };
      });
      const at = `${count} casts at ${width}x${height}`;
      expect(fit.bands, at).toBe(count);
      expect(fit.cards, at).toBe(count);
      expect(fit.horizontal, at).toBeLessThanOrEqual(0);
      expect(fit.titleInside, at).toBe(true);
      expect(fit.titleInHero, at).toBe(true);
      expect(fit.cardsInside, at).toBe(true);
      expect(fit.namesInside, at).toBe(true);
      // the bands of one row are the same distance apart, and all the same height
      for (const row of fit.spacing) for (const distance of row) expect(Math.abs(distance - row[0]), at).toBeLessThanOrEqual(2);
      expect(new Set(fit.heights).size, at).toBe(1);
      const phone = width <= 760;
      const expectedRows = phone && count >= 4 ? { 4: [2, 2], 5: [3, 2], 6: [3, 3] }[count] : [count];
      expect(fit.perRow, at).toEqual(expectedRows);
    }
  });
}

// The contrast is measured on desktop, then after the window is resized to a phone (390x844).
for (const theme of ACT_THEMES) {
  test(`B の文字コントラスト(PC幅・phone幅) ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openFinale(page, writerData, { theme });
    for (const [width, height] of [[1440, 1000], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(1200);
      const result = await measureContrast(page, { excluded: [...DECORATIVE_SELECTORS, ".neotokyo-sequence__header"] });
      expect(result.items.length, `${width}x${height}`).toBeGreaterThan(8);
      expect(result.failures.map(formatFailure), `${width}x${height}`).toEqual([]);
    }
    // the bottom of the page: the guests and the footer text (the theme layer's on-dark colour must not reach it)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(600);
    const bottom = await measureContrast(page, { excluded: [...DECORATIVE_SELECTORS, ".neotokyo-sequence__header"] });
    expect(bottom.items.some(item => /footer/.test(item.selector)), "the footer text is measured").toBe(true);
    expect(bottom.failures.map(formatFailure), "bottom of the page").toEqual([]);
  });
}

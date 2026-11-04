import { test, expect } from "@playwright/test";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes, showcaseData, clickAccessWhenReady } from "./fixtures/act-showcase-data.js";

// The final board's KEY STYLE is each cast's assigned style in cast order (not the first three styles of the
// first cast), and it stays inside its frame even with six casts.
const SIX_STYLES = ["ブラックハウンド", "ミストレス", "ニューロ", "トーキー", "カリスマ", "フェイト"];
const sixCasts = {
  ...showcaseData,
  casts: SIX_STYLES.map((style, index) => ({
    ...showcaseData.casts[index % 3],
    slot: `CAST 0${index + 1}`,
    serial: `TNX-VISUAL10${index}`,
    fullName: `“テスト${index + 1}” 担当${style}`,
    styles: [{ label: `${style}◎`, handoutRole: true }, { label: "カゼ●", handoutRole: false }]
  }))
};

async function openBoard(page, data, theme) {
  await installActShowcaseRoutes(page, data);
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}&flip=fast`);
  const access = page.locator(".neotokyo-finale__access-button");
  const advance = page.locator(".neotokyo-sequence__advance");
  await expect(page.locator(".neotokyo-sequence__access-seal")).toHaveClass(/is-authorized/, { timeout: 15_000 });
  for (let step = 0; step < 14; step += 1) {
    if (await access.isVisible()) break;
    await expect(advance).toBeVisible({ timeout: 15_000 });
    const label = ((await advance.textContent()) || "").trim();
    await advance.click({ force: true });
    if (label === "NEXT // ACT SUMMARY") break;
    await expect(advance).not.toHaveText(label, { timeout: 15_000 });
  }
  await expect(access).toBeVisible({ timeout: 20_000 });
  await clickAccessWhenReady(page, access);
  await expect(page.locator(".poster-v2-act-meta__cell.is-style strong")).toBeVisible();
}

test("KEY STYLE: 担当スタイルをPC順に × でつなぐ(3人)", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openBoard(page, showcaseData, "nova");
  await expect(page.locator(".poster-v2-act-meta__cell.is-style > span")).toHaveText("KEY STYLE");
  await expect(page.locator(".poster-v2-act-meta__cell.is-style strong")).toHaveText("カブキ × カブト × トーキー");
  // switching the cast does not change it
  await page.locator(".poster-v2-roster__item").nth(1).click();
  await expect(page.locator(".poster-v2-act-meta__cell.is-style strong")).toHaveText("カブキ × カブト × トーキー");
});

for (const [width, height] of [[1440, 1000], [1024, 768], [390, 844]]) {
  test(`KEY STYLE: 6人でも枠からはみ出さない (${width}px)`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height });
    await openBoard(page, sixCasts, ACT_THEMES[width % ACT_THEMES.length]);
    const value = page.locator(".poster-v2-act-meta__cell.is-style strong");
    await expect(value).toHaveText(SIX_STYLES.join(" × "));
    const fit = await page.evaluate(() => {
      const cell = document.querySelector(".poster-v2-act-meta__cell.is-style");
      const strong = cell.querySelector("strong");
      const frame = document.querySelector(".poster-v2-frame").getBoundingClientRect();
      const box = cell.getBoundingClientRect();
      const text = strong.getBoundingClientRect();
      return {
        textInsideCell: text.left >= box.left - 0.5 && text.right <= box.right + 0.5 && strong.scrollWidth <= strong.clientWidth + 1,
        cellInsideFrame: box.left >= frame.left - 0.5 && box.right <= frame.right + 0.5,
        lines: Math.round(text.height / parseFloat(getComputedStyle(strong).lineHeight))
      };
    });
    expect(fit.textInsideCell, JSON.stringify(fit)).toBe(true);
    expect(fit.cellInsideFrame, JSON.stringify(fit)).toBe(true);
  });
}

test("KEY STYLE: 担当スタイルが1件もないアクトは —", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const none = { ...showcaseData, casts: showcaseData.casts.map(cast => ({ ...cast, styles: cast.styles.map(style => ({ ...style, handoutRole: false })) })) };
  await openBoard(page, none, "nova");
  await expect(page.locator(".poster-v2-act-meta__cell.is-style strong")).toHaveText("—");
});

// The access button is drawn before the sequence waits for it; a click in that gap used to be dropped and the board never
// opened (the flaky failure of this file). The page itself clicks the button in the same turn it is inserted (always inside
// the gap, whatever the load), and clickAccessWhenReady must still get through afterwards.
test("KEY STYLE: 受付前に押されたアクセスボタンのクリックは捨てられ、受付後のクリックで開く", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    window.__earlyAccess = null;
    new MutationObserver(() => {
      const button = document.querySelector(".neotokyo-finale__access-button");
      if (!button || window.__earlyAccess) return;
      const stage = document.querySelector(".neotokyo-sequence__stage");
      window.__earlyAccess = { awaiting: stage.classList.contains("is-awaiting-advance") };
      button.click();
      window.__earlyAccess.hiddenAfter = document.querySelector("#cinematic-intro")?.getAttribute("aria-hidden") === "true";
    }).observe(document, { childList: true, subtree: true });
  });
  await installActShowcaseRoutes(page, showcaseData);
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=nova&flip=fast`);
  const access = page.locator(".neotokyo-finale__access-button");
  const advance = page.locator(".neotokyo-sequence__advance");
  await expect(page.locator(".neotokyo-sequence__access-seal")).toHaveClass(/is-authorized/, { timeout: 15_000 });
  for (let step = 0; step < 14; step += 1) {
    if (await access.isVisible()) break;
    await expect(advance).toBeVisible({ timeout: 15_000 });
    const label = ((await advance.textContent()) || "").trim();
    await advance.click({ force: true });
    if (label === "NEXT // ACT SUMMARY") break;
    await expect(advance).not.toHaveText(label, { timeout: 15_000 });
  }
  await clickAccessWhenReady(page, access);
  // the intro is hidden, then taken out of the page
  await expect(page.locator("#cinematic-intro")).toHaveCount(0, { timeout: 8_000 });
  const early = await page.evaluate(() => window.__earlyAccess);
  expect(early, "the button was inserted before the sequence waited for it").toEqual({ awaiting: false, hiddenAfter: false });
});

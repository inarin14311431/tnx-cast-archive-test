import { test, expect } from "@playwright/test";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes, showcaseData } from "./fixtures/act-showcase-data.js";
import { DECORATIVE_SELECTORS, formatFailure, measureContrast } from "./fixtures/act-showcase-contrast.js";

// docs/ACT_SHOWCASE_SCENES.md §6 #7 (3rd pattern: ready): ACT READY pattern B (centred portraits). A showcase whose composition says { ready: "b" }
// plays it; everything else plays pattern A. B uses class names of its own, so none of pattern A's decorations (finale lockup,
// FINAL BRIEFING heading, guest rail, scenario-writer credit, access button, click guard) reach it. The guests and the
// scenario-writer credit are drawn by B itself; the footer button is the only way out; when drawing B fails the frame is played as A.
const withScenes = (scenes, extra = {}) => ({ ...showcaseData, scenes, ...extra });
const READY = '.neotokyo-sequence__screen[data-scene="ready"]';
const A_HOOKS = [".neotokyo-sequence__screen--summary", ".neotokyo-finale__lockup", ".neotokyo-finale__access-button", ".neotokyo-supporting-cast", ".neotokyo-sequence__summary-cast"];

// Walks the sequence on its footer button up to ACT READY (OPEN FULL SHOWCASE).
// override: routes added after the standard ones (the last route registered wins).
async function openReady(page, data, theme = "nova", override) {
  await installActShowcaseRoutes(page, data);
  if (override) await override();
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}`);
  const advance = page.locator(".neotokyo-sequence__advance");
  const access = page.locator(".neotokyo-finale__access-button");
  for (let step = 0; step < 20; step += 1) {
    await expect.poll(async () => await access.isVisible() || await advance.isVisible(), { timeout: 20_000 }).toBe(true);
    if (await access.isVisible()) break;
    const label = ((await advance.textContent()) || "").trim();
    if (label === "OPEN FULL SHOWCASE") break;
    await advance.click({ force: true });
    await expect.poll(async () => await access.isVisible() || !(await advance.isVisible()) || ((await advance.textContent()) || "").trim() !== label, { timeout: 15_000 }).toBe(true);
  }
  await expect(page.locator(READY)).toHaveClass(/is-visible/, { timeout: 20_000 });
  return advance;
}

const writerData = withScenes({ ready: "b" }, { scenarioWriterName: "脚本 太郎" });

test("B を選ぶと B の画面が出て、A の装飾(ロックアップ・ゲスト欄・アクセスボタン)は付かない", async ({ page }) => {
  test.setTimeout(90_000);
  await openReady(page, writerData);
  const screen = page.locator(READY);
  await expect(screen).toHaveAttribute("data-scene-pattern", "b");
  await expect(screen).toHaveClass(/neotokyo-ready-b/);
  await expect(screen.locator(".neotokyo-ready-b__ready")).toHaveText("ACT READY");
  await expect(screen.locator("h2")).toHaveText(showcaseData.actName);
  await expect(screen.locator(".neotokyo-ready-b__name")).toHaveCount(showcaseData.casts.length);
  await expect(screen.locator(".neotokyo-ready-b__slot")).toHaveText(showcaseData.casts.map((_, index) => `PC${index + 1}`));
  // let the observers of pattern A run, then check that none of them found this screen
  await page.waitForTimeout(1200);
  for (const selector of A_HOOKS) await expect(page.locator(selector), selector).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveClass(/showcase-neotokyo-finale-active/);
  await expect(screen.locator("h2")).not.toHaveText("FINAL BRIEFING");
});

test("ゲストと脚本家は、キャストの下の小さな行として B 自身が描く", async ({ page }) => {
  test.setTimeout(90_000);
  await openReady(page, writerData);
  const extras = page.locator(`${READY} .neotokyo-ready-b__extra`);
  await expect(extras).toHaveCount(2);
  await expect(extras.nth(0)).toContainText("GUEST");
  await expect(extras.nth(0)).toContainText("“ゲスト” 協力者 K");
  await expect(extras.nth(1)).toContainText("SCENARIO WRITER");
  await expect(extras.nth(1)).toContainText("脚本 太郎");
  // under the casts
  const order = await page.evaluate(() => {
    const top = selector => document.querySelector(selector).getBoundingClientRect().top;
    return [top(".neotokyo-ready-b__casts"), top(".neotokyo-ready-b__extras")];
  });
  expect(order[1]).toBeGreaterThan(order[0]);
});

test("ゲストも脚本家もいなければ、その行は出さない", async ({ page }) => {
  test.setTimeout(90_000);
  const guests = (status, body) => () => page.route("**/rest/v1/rpc/get_public_act_showcase_guests", route => route.fulfill({ status, headers: { "access-control-allow-origin": "*", "content-type": "application/json" }, body }));
  await openReady(page, withScenes({ ready: "b" }), "nova", guests(200, "[]"));
  await expect(page.locator(`${READY} .neotokyo-ready-b__extras`)).toHaveCount(0);
});

test("役割ラベルが無いキャストには、何も出さない(UNREGISTERED も空欄も出さない)", async ({ page }) => {
  test.setTimeout(90_000);
  const casts = showcaseData.casts.map((cast, index) => index === 0
    ? { ...cast, participationRole: "", styles: cast.styles.map(style => ({ ...style, handoutRole: false })) }
    : { ...cast, participationRole: "ロール名" });
  await openReady(page, withScenes({ ready: "b" }, { casts }));
  const items = page.locator(`${READY} .neotokyo-ready-b__cast`);
  await expect(items.nth(0).locator(".neotokyo-ready-b__role")).toHaveCount(0);
  await expect(items.nth(1).locator(".neotokyo-ready-b__role")).toHaveText("ロール名");
  await expect(page.locator(READY)).not.toContainText("NO HANDLE");
});

test("誤クリックでは進まない: 画面や余白をクリックしても ACT READY のまま、フッターのボタンだけで進む", async ({ page }) => {
  test.setTimeout(90_000);
  const advance = await openReady(page, writerData);
  const screen = page.locator(READY);
  const box = await screen.boundingBox();
  const stage = await page.locator(".neotokyo-sequence__stage").boundingBox();
  // the screen itself, a portrait, and the margin of the stage beside the screen
  await page.mouse.click(box.x + box.width / 2, box.y + 14);
  await screen.locator(".neotokyo-ready-b__image").first().click({ force: true });
  await page.mouse.click(stage.x + 3, stage.y + stage.height / 2);
  await page.waitForTimeout(700);
  await expect(page.locator("#cinematic-intro")).toHaveCount(1);
  await expect(screen).toHaveClass(/is-visible/);
  await expect(advance).toHaveText("OPEN FULL SHOWCASE");
  await advance.click({ force: true });
  await expect(page.locator("#cinematic-intro")).toHaveCount(0, { timeout: 8_000 });
});

test("A を指定しても、scenes が無くても、A のまま(ロックアップなどの付いた画面)", async ({ page }) => {
  test.setTimeout(90_000);
  for (const data of [withScenes({ ready: "a" }), { ...showcaseData, scenes: undefined }]) {
    await openReady(page, data);
    const screen = page.locator(READY);
    await expect(screen).toHaveAttribute("data-scene-pattern", "a");
    await expect(screen).toHaveClass(/neotokyo-sequence__screen--summary/);
    await expect(page.locator(".neotokyo-ready-b")).toHaveCount(0);
    await expect(page.locator(".neotokyo-finale__access-button")).toHaveCount(1, { timeout: 10_000 });
  }
});

test("B の再生に失敗したら、その枠は A で再生され、先へ進める", async ({ page }) => {
  test.setTimeout(90_000);
  const warnings = [];
  page.on("console", message => { if (message.type() === "warning") warnings.push(message.text()); });
  await page.route("**/js/act-showcase-ready-b.js*", route => route.fulfill({
    contentType: "text/javascript",
    body: 'export function createReadyScreenB() { throw new Error("pattern B is broken"); }\nexport function normalizeReadyGuests() { return []; }'
  }));
  await openReady(page, writerData);
  const screen = page.locator(READY);
  await expect(screen).toHaveAttribute("data-scene-pattern", "a");
  await expect(screen).toHaveClass(/neotokyo-sequence__screen--summary/);
  await expect(page.locator(".neotokyo-ready-b")).toHaveCount(0);
  expect(warnings.some(text => text.includes('scene "ready" pattern "b" failed'))).toBe(true);
  await page.locator(".neotokyo-finale__access-button").click({ force: true });
  await expect(page.locator("#cinematic-intro")).toHaveCount(0, { timeout: 8_000 });
});

test("ゲストの取得に失敗しても B は出て、ゲストの行だけが無い", async ({ page }) => {
  test.setTimeout(90_000);
  await openReady(page, writerData, "nova", () => page.route("**/rest/v1/rpc/get_public_act_showcase_guests", route => route.fulfill({ status: 500, headers: { "access-control-allow-origin": "*", "content-type": "application/json" }, body: "{}" })));
  await expect(page.locator(READY)).toHaveAttribute("data-scene-pattern", "b");
  await expect(page.locator(`${READY} .neotokyo-ready-b__extra`)).toHaveCount(1);
  await expect(page.locator(`${READY} .neotokyo-ready-b__extra`)).toContainText("SCENARIO WRITER");
});

test("reduced-motion では、動かさず最終の状態をすぐ表示する", async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openReady(page, writerData);
  const state = await page.evaluate(() => {
    const style = selector => getComputedStyle(document.querySelector(selector));
    return [style(".neotokyo-ready-b").animationName, style(".neotokyo-ready-b__cast").animationName, style(".neotokyo-ready-b__cast").opacity];
  });
  expect(state).toEqual(["none", "none", "1"]);
});

// 6 casts, the longest names: at 390 wide (iPhone Safari portrait), 360x640 (narrowest Android), 844x390 (a phone held sideways)
// and on desktop, nothing leaves its cell, nothing overflows sideways, and every name and the footer button stay reachable.
const LONG = "“夜明けを駆け抜けるネオンの亡霊” 神楽坂 ALEXANDER VON NEON 零式";
const sixCasts = Array.from({ length: 6 }, (_, index) => ({ ...showcaseData.casts[index % 3], fullName: index % 2 ? LONG : "ル 名", styles: [{ label: "とても長いスタイル名の組み合わせ◎", handoutRole: true }, { label: "カゼ●", handoutRole: false }, { label: "ニューロ", handoutRole: false }] }));
for (const [width, height] of [[1440, 900], [1024, 768], [390, 844], [360, 640], [844, 390]]) {
  test(`最大6人・最長の名前でも、はみ出さず、読める ${width}x${height}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height });
    await openReady(page, withScenes({ ready: "b" }, { casts: sixCasts, scenarioWriterName: "とても長い名前の脚本家 ALEXANDER VON NEON" }));
    await page.waitForTimeout(1600);
    const fit = await page.evaluate(() => {
      const box = selector => document.querySelector(selector).getBoundingClientRect();
      const screen = document.querySelector(".neotokyo-ready-b");
      const frame = box(".neotokyo-ready-b");
      const cells = [...document.querySelectorAll(".neotokyo-ready-b__cast")];
      return {
        horizontal: document.documentElement.scrollWidth - innerWidth,
        screenSideways: screen.scrollWidth - screen.clientWidth,
        outsideCell: cells.some(cell => {
          const cellBox = cell.getBoundingClientRect();
          return [...cell.children].some(child => child.getBoundingClientRect().left < cellBox.left - 1 || child.getBoundingClientRect().right > cellBox.right + 1);
        }),
        clampedNames: [...document.querySelectorAll(".neotokyo-ready-b__name")].every(name => name.scrollHeight <= name.clientHeight + 2 || getComputedStyle(name).webkitLineClamp === "3"),
        cells: cells.length,
        outsideScreenX: cells.some(cell => cell.getBoundingClientRect().left < frame.left - 1 || cell.getBoundingClientRect().right > frame.right + 1),
        footer: box(".neotokyo-sequence__footer").bottom - innerHeight,
        advance: box(".neotokyo-sequence__advance").bottom - innerHeight
      };
    });
    expect(fit.cells).toBe(6);
    expect(fit.horizontal).toBeLessThanOrEqual(0);
    expect(fit.screenSideways).toBeLessThanOrEqual(0);
    expect(fit.outsideCell).toBe(false);
    expect(fit.outsideScreenX).toBe(false);
    expect(fit.clampedNames).toBe(true);
    expect(fit.footer).toBeLessThanOrEqual(1);
    expect(fit.advance).toBeLessThanOrEqual(1);
    // every cast can be brought into view by scrolling the screen: the last cell ends inside the scrollable area
    const reach = await page.evaluate(() => {
      const screen = document.querySelector(".neotokyo-ready-b");
      const last = [...document.querySelectorAll(".neotokyo-ready-b__cast")].pop();
      last.scrollIntoView({ block: "end" });
      const frame = screen.getBoundingClientRect();
      const box = last.getBoundingClientRect();
      return box.bottom <= frame.bottom + 1 && box.top >= frame.top - 1;
    });
    expect(reach).toBe(true);
  });
}

for (const theme of ACT_THEMES) {
  for (const [width, height] of [[1440, 1000], [390, 844]]) {
    test(`B の文字コントラスト ${theme} ${width}x${height}`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height });
      await openReady(page, withScenes({ ready: "b" }, { scenarioWriterName: "脚本 太郎" }), theme);
      await page.waitForTimeout(2200);
      // the shared header ("MUNICIPAL DATABASE", 3.41:1 on intron at 390 wide) is the same on every frame and pattern: a known issue of its own, not measured here
      const result = await measureContrast(page, { excluded: [...DECORATIVE_SELECTORS, ".neotokyo-sequence__header"] });
      expect(result.items.length).toBeGreaterThan(8);
      expect(result.failures.map(formatFailure)).toEqual([]);
    });
  }
}

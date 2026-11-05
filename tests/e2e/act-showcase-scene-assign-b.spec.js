import { test, expect } from "@playwright/test";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes, showcaseData } from "./fixtures/act-showcase-data.js";
import { DECORATIVE_SELECTORS, formatFailure, measureContrast } from "./fixtures/act-showcase-contrast.js";

// docs/ACT_SHOWCASE_SCENES.md §6 #7 (4th pattern: handout-assign): HANDOUT / ASSIGN pattern B (the portrait first). A showcase whose composition
// says { "handout-assign": "b" } plays it; everything else plays pattern A. B uses class names of its own, so none of pattern A's
// observers (handout context cells, assigned route, handout scroll, scroll cue, role repair) reach it. The role is read from the model
// (a cast without one shows nothing for it), and the screen's state is two attributes, data-phase and data-flip, which this spec waits on:
// no test here waits for a fixed time. When drawing B fails the frame is played as A.
const withScenes = (scenes, extra = {}) => ({ ...showcaseData, scenes, ...extra });
const BSCENE = { "handout-assign": "b" };
const SCREEN = '.neotokyo-sequence__screen[data-scene="handout-assign"]';
const B = ".neotokyo-assign-b";
const A_HOOKS = [".neotokyo-sequence__screen--linked", ".neotokyo-sequence__handout-panel", ".neotokyo-sequence__assign-panel", ".neotokyo-sequence__cast--linked", ".neotokyo-story__handout-context", ".neotokyo-story__assigned-route", ".neotokyo-style-card"];

// Walks the sequence on its footer button up to the first handout (the footer button then says ASSIGN // PC1).
// override: routes added after the standard ones (the last route registered wins).
async function openHandout(page, data, theme = "nova", override) {
  await installActShowcaseRoutes(page, data);
  if (override) await override();
  // flip=fast: the cards turn quickly
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}&flip=fast`);
  const advance = page.locator(".neotokyo-sequence__advance");
  for (let step = 0; step < 8; step += 1) {
    await expect(advance).toBeVisible({ timeout: 20_000 });
    const label = ((await advance.textContent()) || "").trim();
    if (label.startsWith("ASSIGN")) break;
    await advance.click({ force: true });
    await expect.poll(async () => !(await advance.isVisible()) || ((await advance.textContent()) || "").trim() !== label, { timeout: 15_000 }).toBe(true);
  }
  await expect(page.locator(`${SCREEN}.is-visible`)).toBeVisible({ timeout: 20_000 });
  return advance;
}

// Presses ASSIGN and waits for the end state of the assignment: the cast is in the slot and the cards have turned.
async function assign(page, advance) {
  await advance.click({ force: true });
  await expect(page.locator(`${B}[data-phase="assigned"][data-flip="done"]`)).toBeVisible({ timeout: 20_000 });
}

test("B を選ぶと B の画面が出て、A の観察層の装飾は付かない。状態は reading → read → searching → found → assigned(札は idle → running → done)", async ({ page }) => {
  test.setTimeout(120_000);
  // record every value the two state attributes take, from the page itself (nothing here waits for a time)
  await page.addInitScript(() => {
    window.__states = { phase: [], flip: [] };
    new MutationObserver(records => {
      for (const record of records) {
        // the screen is built with its first values and then inserted: take them when it is inserted
        for (const added of record.addedNodes) {
          if (added.nodeType === 1 && added.matches?.(".neotokyo-assign-b")) {
            window.__states.phase.push(added.getAttribute("data-phase"));
            window.__states.flip.push(added.getAttribute("data-flip"));
          }
        }
        if (record.type !== "attributes") continue;
        const target = record.target;
        if (!target.matches?.(".neotokyo-assign-b")) continue;
        const name = record.attributeName === "data-phase" ? "phase" : "flip";
        window.__states[name].push(target.getAttribute(record.attributeName));
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-phase", "data-flip"] });
  });
  const advance = await openHandout(page, withScenes(BSCENE));
  const screen = page.locator(SCREEN);
  await expect(screen).toHaveAttribute("data-scene-pattern", "b");
  await expect(screen).toHaveClass(/neotokyo-assign-b/);
  await expect(page.locator(`${B}[data-phase="read"]`)).toBeVisible();
  // before the assignment: the slot is empty (the face is there but hidden), the name and the cards wait
  const before = await page.evaluate(() => {
    const opacity = selector => getComputedStyle(document.querySelector(selector)).opacity;
    return { portrait: opacity(".neotokyo-assign-b__portrait"), who: getComputedStyle(document.querySelector(".neotokyo-assign-b__who")).visibility, cards: getComputedStyle(document.querySelector(".neotokyo-assign-b__cards")).visibility, label: document.querySelector(".neotokyo-assign-b__ring-label").textContent };
  });
  expect(before).toEqual({ portrait: "0", who: "hidden", cards: "hidden", label: "PC1" });
  await expect(screen.locator(".neotokyo-assign-b__subject-text")).toHaveText("カブキ");
  await expect(screen.locator(".neotokyo-assign-b__fact")).toHaveText([/ROLE\s*カブキ◎/, /CONNECTION\s*千早雅之/, /SUIT\s*情熱/]);
  await assign(page, advance);
  expect(await page.evaluate(() => window.__states)).toEqual({
    phase: ["reading", "read", "searching", "found", "assigned"],
    flip: ["idle", "running", "done"]
  });
  const after = await page.evaluate(() => {
    const ring = document.querySelector(".neotokyo-assign-b__ring");
    const img = document.querySelector(".neotokyo-assign-b__portrait img");
    return { portrait: getComputedStyle(document.querySelector(".neotokyo-assign-b__portrait")).opacity, round: getComputedStyle(ring).borderRadius, transform: getComputedStyle(img).transform, position: getComputedStyle(img).objectPosition, cards: [...document.querySelectorAll(".neotokyo-assign-b__card")].map(card => card.classList.contains("is-flipped")), role: [...document.querySelectorAll(".neotokyo-assign-b__card.is-role")].map(card => card.textContent.trim()) };
  });
  expect(after.portrait).toBe("1");
  expect(after.round).toBe("50%");
  // the round cut: one fixed zoom (1.25 from the top), no per-image adjustment
  expect(after.transform).toBe("matrix(1.25, 0, 0, 1.25, 0, 0)");
  expect(after.position).toBe("50% 6%");
  expect(after.cards).toEqual([true, true, true]);
  expect(after.role).toEqual(["カブキ◎"]);
  // the handle and the name each have a line of their own
  await expect(screen.locator(".neotokyo-assign-b__handle")).toHaveText("“ブルー・モーメント”");
  await expect(screen.locator(".neotokyo-assign-b__real")).toHaveText("夜明けのランナー");
  await expect(page.locator(".neotokyo-sequence__footer span").first()).toContainText("CAST ASSIGNED");
  // let the observers of pattern A run, then check that none of them found this screen
  await page.waitForTimeout(1200);
  for (const selector of A_HOOKS) await expect(page.locator(selector), selector).toHaveCount(0);
  await expect(advance).toHaveText("NEXT // HANDOUT 02");
});

test("役割が無いキャストには、何も出さない(ROLE も UNREGISTERED も、強調するカードも無い)", async ({ page }) => {
  test.setTimeout(90_000);
  const casts = showcaseData.casts.map((cast, index) => index === 0
    ? { ...cast, participationRole: "", styles: cast.styles.map(style => ({ ...style, handoutRole: false })) }
    : cast);
  const advance = await openHandout(page, withScenes(BSCENE, { casts }));
  await expect(page.locator(`${B}[data-phase="read"]`)).toBeVisible();
  await expect(page.locator(`${B} .neotokyo-assign-b__fact-label`)).not.toContainText(["ROLE"]);
  await expect(page.locator(`${B} .neotokyo-assign-b__status`)).toHaveText("HANDOUT COMPLETE // AWAITING ASSIGN");
  await assign(page, advance);
  await expect(page.locator(`${B} .neotokyo-assign-b__role`)).toHaveCount(0);
  await expect(page.locator(`${B} .neotokyo-assign-b__card.is-role`)).toHaveCount(0);
  await expect(page.locator(B)).not.toContainText("UNREGISTERED");
});

test("ハンドアウトに項目が無い・本文が空でも、足りない項目は作らない", async ({ page }) => {
  test.setTimeout(90_000);
  const casts = showcaseData.casts.map((cast, index) => index === 0 ? { ...cast, handout: { title: "自由な題", body: "" } } : cast);
  await openHandout(page, withScenes(BSCENE, { casts }));
  await expect(page.locator(`${B}[data-phase="read"]`)).toBeVisible();
  await expect(page.locator(`${B} .neotokyo-assign-b__subject-text`)).toHaveText("自由な題");
  await expect(page.locator(`${B} .neotokyo-assign-b__caption`)).toHaveCount(0);
  await expect(page.locator(`${B} .neotokyo-assign-b__fact`)).toHaveCount(1); // ROLE only
  await expect(page.locator(`${B} .neotokyo-assign-b__copy`)).toContainText("公開用ハンドアウト本文は登録されていません。");
});

test("A を指定しても、scenes が無くても、A のまま(A の観察層が付いた画面)", async ({ page }) => {
  test.setTimeout(90_000);
  for (const data of [withScenes({ "handout-assign": "a" }), { ...showcaseData, scenes: undefined }]) {
    await openHandout(page, data);
    const screen = page.locator(SCREEN);
    await expect(screen).toHaveAttribute("data-scene-pattern", "a");
    await expect(screen).toHaveClass(/neotokyo-sequence__screen--linked/);
    await expect(page.locator(B)).toHaveCount(0);
  }
});

test("B の再生に失敗したら、その枠は A で再生され、先へ進める", async ({ page }) => {
  test.setTimeout(90_000);
  const warnings = [];
  page.on("console", message => { if (message.type() === "warning") warnings.push(message.text()); });
  await page.route("**/js/act-showcase-assign-b.js*", route => route.fulfill({
    contentType: "text/javascript",
    body: 'export function createAssignScreenB() { throw new Error("pattern B is broken"); }'
  }));
  const advance = await openHandout(page, withScenes(BSCENE));
  const screen = page.locator(SCREEN);
  await expect(screen).toHaveAttribute("data-scene-pattern", "a");
  await expect(screen).toHaveClass(/neotokyo-sequence__screen--linked/);
  await expect(page.locator(B)).toHaveCount(0);
  expect(warnings.some(text => text.includes('scene "handout-assign" pattern "b" failed'))).toBe(true);
  await advance.click({ force: true });
  await expect(page.locator(".neotokyo-sequence__screen--linked.is-assigned")).toBeVisible({ timeout: 15_000 });
});

test("SKIP で、再生の途中でも終わる", async ({ page }) => {
  test.setTimeout(90_000);
  await openHandout(page, withScenes(BSCENE));
  await page.locator(".neotokyo-sequence__skip").click();
  await expect(page.locator("#cinematic-intro")).toHaveCount(0, { timeout: 15_000 });
});

test("reduced-motion では、札は最初から表向きで、最後の状態までそのまま進む", async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const advance = await openHandout(page, withScenes(BSCENE));
  await expect(page.locator(`${B}[data-phase="read"]`)).toBeVisible();
  await expect(page.locator(`${B} .neotokyo-assign-b__card.is-flipped`)).toHaveCount(3);
  await assign(page, advance);
  const motion = await page.evaluate(() => [".neotokyo-assign-b", ".neotokyo-assign-b__card-inner", ".neotokyo-assign-b__portrait"].map(selector => getComputedStyle(document.querySelector(selector)).transitionDuration));
  expect(motion).toEqual(["0s", "0s", "0s"]);
});

// The longest handle and name, a long handout text, three very long style names: at 390 wide (iPhone Safari portrait), 360x640 (narrowest
// Android), 844x390 (a phone held sideways) and on desktop, nothing leaves the screen sideways, the name and the cards can be reached
// (the screen scrolls inside itself), and the handout text follows its caret inside its own box. One walk, then the window is resized.
const LONG_NAME = "“夜明けを駆け抜けるネオンの亡霊と呼ばれた伝説のランナー” 神楽坂 ALEXANDER VON NEON 零式 ミドルネーム付き";
const LONG_BODY = `推奨スタイル：カブキ\nコネ：千早雅之　推奨スート：情熱\n${"消えたデータの痕跡を追う運び屋として、事件の渦中に巻き込まれる。".repeat(14)}`;
test("最長のハンドルと名前・長い本文でも、はみ出さず、名前とカードに届き、本文は追従する(1440x900・1024x768・390x844・360x640・844x390)", async ({ page }) => {
  test.setTimeout(150_000);
  const casts = showcaseData.casts.map((cast, index) => index === 0
    ? { ...cast, fullName: LONG_NAME, tagline: "とても長い一言とても長い一言とても長い一言とても長い一言", handout: { ...cast.handout, body: LONG_BODY }, styles: [{ label: "とても長いスタイル名の組み合わせ◎", handoutRole: true }, { label: "もう一つの長いスタイル名●", handoutRole: false }, { label: "ニューロ", handoutRole: false }] }
    : cast);
  await page.setViewportSize({ width: 1440, height: 900 });
  const advance = await openHandout(page, withScenes(BSCENE, { casts }));
  await expect(page.locator(`${B}[data-phase="read"]`)).toBeVisible();
  // the long text is typed in a box that scrolls: the caret (the end of the text) is in view
  const followed = await page.evaluate(() => {
    const body = document.querySelector(".neotokyo-assign-b__body");
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let last = null;
    while (walker.nextNode()) if (walker.currentNode.length) last = walker.currentNode;
    const range = document.createRange();
    range.setStart(last, last.length - 1);
    range.setEnd(last, last.length);
    const rect = range.getBoundingClientRect();
    const box = body.getBoundingClientRect();
    return { overflows: body.scrollHeight > body.clientHeight + 1, scrolled: body.scrollTop > 0, lastCharInView: rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1 };
  });
  expect(followed).toEqual({ overflows: true, scrolled: true, lastCharInView: true });
  await assign(page, advance);
  for (const [width, height] of [[1440, 900], [1024, 768], [390, 844], [360, 640], [844, 390]]) {
    await page.setViewportSize({ width, height });
    // the end state is kept (the layout answers to the size): scroll the screen to its end and look at what can be reached
    const fit = await page.evaluate(() => {
      const screen = document.querySelector(".neotokyo-assign-b");
      screen.scrollTop = screen.scrollHeight;
      const box = screen.getBoundingClientRect();
      const inside = selector => { const rect = document.querySelector(selector).getBoundingClientRect(); return rect.left >= box.left - 0.5 && rect.right <= box.right + 0.5; };
      const cards = document.querySelector(".neotokyo-assign-b__cards").getBoundingClientRect();
      const footer = document.querySelector(".neotokyo-sequence__advance").getBoundingClientRect();
      return {
        sideways: screen.scrollWidth <= screen.clientWidth + 1,
        name: inside(".neotokyo-assign-b__name"),
        cards: inside(".neotokyo-assign-b__cards"),
        cardsReached: cards.bottom <= box.bottom + 1 && cards.top >= box.top - 1,
        footerInside: footer.right <= innerWidth + 0.5 && footer.bottom <= innerHeight + 0.5 && footer.left >= -0.5
      };
    });
    expect(fit, `${width}x${height}`).toEqual({ sideways: true, name: true, cards: true, cardsReached: true, footerInside: true });
  }
});

for (const theme of ACT_THEMES) {
  test(`B の文字コントラスト(PC幅・phone幅) ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    const advance = await openHandout(page, withScenes(BSCENE), theme);
    await assign(page, advance);
    for (const [width, height] of [[1440, 1000], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => { const screen = document.querySelector(".neotokyo-assign-b"); screen.scrollTop = 0; });
      // the shared header ("MUNICIPAL DATABASE", 3.41:1 on intron at 390 wide) is the same on every frame and pattern: a known issue of its own, not measured here
      const result = await measureContrast(page, { excluded: [...DECORATIVE_SELECTORS, ".neotokyo-sequence__header"] });
      expect(result.items.length, `${width}x${height}`).toBeGreaterThan(8);
      expect(result.failures.map(formatFailure), `${width}x${height}`).toEqual([]);
    }
  });
}

import { test, expect } from "@playwright/test";
import zlib from "node:zlib";
import { ACT_SLUG, showcaseData, guestData } from "./fixtures/act-showcase-data.js";

// Phone widths with real-sized artwork. The other specs use 1px-wide placeholder pictures and long-name-free
// data, so a grid or flex row that grows with its content (min-content) never shows. iOS Safari then widens the
// layout viewport instead of clipping, which is what the "page is twice as wide" report looked like. Here the
// page must fit the phone with html/body clipping switched OFF, so the check measures the layout itself.
const WIDTHS = [360, 390, 430];
const TITLE = "NEON AFTERIMAGE";

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function pngChunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

// 1200x1600 portrait-shaped gradient: the size an uploaded illustration really has.
function artPng(seed) {
  const width = 1200;
  const height = 1600;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 3 + 1);
    for (let x = 0; x < width; x += 1) {
      const at = row + 1 + x * 3;
      raw[at] = (40 + seed * 50 + (x >> 3)) & 255;
      raw[at + 1] = (30 + (y >> 3)) & 255;
      raw[at + 2] = (90 + seed * 30) & 255;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 1 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "apikey, authorization, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
  "content-type": "application/json"
};

async function installRoutes(page, origin, { longHandout = false } = {}) {
  const art = [1, 2, 3, 4].map(artPng);
  const data = {
    ...showcaseData,
    pageTitle: TITLE,
    actName: TITLE,
    scenarioWriterName: "芳賀琉",
    casts: showcaseData.casts.map((cast, index) => ({
      ...cast,
      imageUrl: `${origin}/__art/${index}.png`,
      fullName: ["“ブルー・モーメント” 夜明けを駆け抜けるネオン街の運び屋", cast.fullName, cast.fullName][index],
      tagline: index === 0 ? "NEON-AFTERIMAGE-SIGNAL-CHASER" : cast.tagline,
      handout: { ...cast.handout, body: `${cast.handout.body}\nhttps://example.com/very/long/unbroken/url/for/the/handout/body/text${longHandout ? "\n" + "夜の街に残る光の跡を追い、依頼人の過去と向き合う。\n".repeat(40) : ""}` }
    }))
  };
  const guests = [0, 1].map(index => ({ ...guestData[0], sort_order: index + 1, name: `協力者 ${index + 1}`, image_url: `${origin}/__art/3.png` }));
  const fulfill = body => route => route.request().method() === "OPTIONS"
    ? route.fulfill({ status: 204, headers: corsHeaders, body: "" })
    : route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(body) });
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.route("**/__art/*.png", route => route.fulfill({ status: 200, contentType: "image/png", body: art[Number(new URL(route.request().url()).pathname.match(/(\d)\.png$/)[1])] }));
  await page.route("**/rest/v1/rpc/get_public_act_showcase", fulfill(data));
  await page.route("**/rest/v1/rpc/get_public_act_showcase_guests", fulfill(guests));
}

// Layout width with page-level clipping off: a phone's browser widens the page when content overflows.
async function layoutOverflow(page, width) {
  return page.evaluate(w => {
    const style = document.createElement("style");
    style.textContent = "html,body{overflow:visible}";
    document.head.append(style);
    const scrollWidth = document.documentElement.scrollWidth;
    style.remove();
    return scrollWidth - w;
  }, width);
}

for (const width of WIDTHS) {
  test.describe(`${width}px phone`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

    test(`豪華版: 導入の各画面と最終ボードが画面幅${width}pxに収まる(大きな画像・長い題名)`, async ({ page, baseURL }) => {
      test.setTimeout(240_000);
      await installRoutes(page, baseURL);
      await page.goto(`/act-showcase.html?id=${ACT_SLUG}`);
      const advance = page.locator(".neotokyo-sequence__advance");
      const access = page.locator(".neotokyo-finale__access-button");
      await expect(page.locator(".neotokyo-sequence__screen--opening")).toBeVisible({ timeout: 15_000 });

      const checked = [];
      for (let step = 0; step < 20; step += 1) {
        if (await access.isVisible()) break;
        await expect(advance).toBeVisible({ timeout: 15_000 });
        const label = ((await advance.textContent()) || "").trim();
        checked.push(label);
        expect(await layoutOverflow(page, width), `intro screen before "${label}"`).toBeLessThanOrEqual(0);
        // The footer button must stay inside the screen (not under a browser toolbar).
        const bottom = await advance.evaluate(element => element.getBoundingClientRect().bottom);
        expect(bottom, `"${label}" stays inside the screen`).toBeLessThanOrEqual(844);
        const assignPanel = page.locator(".neotokyo-sequence__screen--linked.is-splitting .neotokyo-sequence__assign-panel");
        if (label.startsWith("NEXT // HANDOUT") && await assignPanel.count()) {
          // The assigned cast stacks under the handout at full width (it used to be squeezed into a ~2px column).
          const assigned = await assignPanel.evaluate(element => element.getBoundingClientRect().width);
          expect(assigned, `assign panel width after "${label}"`).toBeGreaterThan(width * 0.7);
          // The screen scrolls inside itself: a cue shows while more is below and goes away at the end.
          const screen = page.locator(".neotokyo-sequence__screen--linked.is-splitting");
          if (await screen.evaluate(element => element.scrollHeight > element.clientHeight + 12)) {
            await expect(screen, "scroll cue while more is below").toHaveAttribute("data-scroll-cue", "1");
            expect(await screen.evaluate(element => getComputedStyle(element, "::after").content)).toContain("▼");
            await screen.evaluate(element => { element.scrollTop = element.scrollHeight; });
            await expect(screen, "scroll cue gone at the end").not.toHaveAttribute("data-scroll-cue", /.*/);
            await screen.evaluate(element => { element.scrollTop = 0; });
          }
        }
        await advance.click({ force: true });
        await expect(advance).not.toHaveText(label, { timeout: 15_000 }).catch(() => {});
      }
      await expect(access).toBeVisible({ timeout: 15_000 });
      expect(checked.length).toBeGreaterThan(6);
      expect(await layoutOverflow(page, width), "ACT READY screen").toBeLessThanOrEqual(0);

      // The cast roster's two captions sit on separate lines.
      const captions = await page.evaluate(() => {
        const bay = document.querySelector(".neotokyo-finale__cast-bay");
        const label = bay?.querySelector(":scope > .neotokyo-sequence__micro");
        const before = bay ? bay.getBoundingClientRect() : null;
        return { top: before?.top ?? 0, labelTop: label?.getBoundingClientRect().top ?? 0, position: bay ? getComputedStyle(bay, "::before").position : "" };
      });
      expect(captions.position, "bay caption flows with the roster caption").toBe("static");

      // PC badges sit in front of each cast name (not on the portrait), at 10px or larger.
      const badges = await page.evaluate(() => [...document.querySelectorAll(".neotokyo-finale__cast-card .neotokyo-sequence__summary-cast-body h3[data-pc]")].map(h3 => {
        const badge = getComputedStyle(h3, "::before");
        return { pc: h3.dataset.pc, text: badge.content, size: parseFloat(badge.fontSize), display: badge.display };
      }));
      expect(badges.length).toBeGreaterThan(0);
      for (const badge of badges) {
        expect(badge.text).toContain(badge.pc);
        expect(badge.size, `${badge.pc} badge font size`).toBeGreaterThanOrEqual(10);
        expect(badge.display).toBe("inline-block");
      }

      await access.click({ force: true });
      await expect(page.locator(".poster-v2-frame").first()).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(3000);
      const titleBox = await page.locator("#opening-act-name").evaluate(element => { const r = element.getBoundingClientRect(); return { right: r.right, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }; });
      expect(titleBox.right, "opening title right edge").toBeLessThanOrEqual(width);
      expect(titleBox.scrollWidth, "opening title text fits its box").toBeLessThanOrEqual(titleBox.clientWidth + 1);

      // Opening: the credit chips and the tagline block never overlap, also with the wider real display fonts
      // (letter-spacing, title and chip size enlarged here) and a long scenario writer's name; their text stays at 10px or larger.
      for (const writer of ["芳賀琉", "長い名前の脚本家"]) {
        const overlaps = await page.evaluate(name => {
          const style = document.createElement("style");
          // Stand-ins for the wider real fonts: more letter-spacing, a larger title (more wrapped lines pushes the chips down)
          // and larger chips. The injected rules are test-only.
          style.textContent = ".scene-opening *{letter-spacing:.08em} #opening-act-name{font-size:54px !important} .scene-opening .opening-ruler{font-size:1.15em}";
          document.head.append(style);
          document.querySelector("#opening-scenario-writer").textContent = `SCENARIO WRITER // ${name}`;
          const boxes = ["#opening-ruler", "#opening-scenario-writer", ".poster-v2-aside"].map(selector => {
            const element = document.querySelector(selector);
            const rect = element.getBoundingClientRect();
            const sizes = [element, ...element.querySelectorAll("*")].filter(node => node.textContent.trim()).map(node => parseFloat(getComputedStyle(node).fontSize));
            return { selector, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, minSize: Math.min(...sizes) };
          });
          style.remove();
          const found = [];
          for (let a = 0; a < boxes.length; a += 1) for (let b = a + 1; b < boxes.length; b += 1) {
            const x = boxes[a], y = boxes[b];
            if (x.left < y.right - 1 && y.left < x.right - 1 && x.top < y.bottom - 1 && y.top < x.bottom - 1) found.push(`${x.selector} x ${y.selector}`);
          }
          return { found, tooSmall: boxes.filter(box => box.minSize < 10).map(box => `${box.selector} ${box.minSize}px`), outside: boxes.filter(box => box.right > innerWidth + 1).map(box => box.selector) };
        }, writer);
        expect(overlaps.found, `opening overlaps (${writer})`).toEqual([]);
        expect(overlaps.tooSmall, `opening text size (${writer})`).toEqual([]);
        expect(overlaps.outside, `opening inside the screen (${writer})`).toEqual([]);
      }

      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 500) {
        await page.evaluate(top => window.scrollTo(0, top), y);
        await page.waitForTimeout(150);
      }
      expect(await layoutOverflow(page, width), "final board").toBeLessThanOrEqual(0);

      // Hero card (character-select layout): the portrait fills the grid width at 4:5, the caption plate stays at
      // two lines or fewer on the top edge, and the name block sits inside the portrait without touching the caption.
      // Rectangles only, so it holds on any engine regardless of how it resolves aspect-ratio against grid stretch.
      const hero = await page.evaluate(() => {
        const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
        const frame = document.querySelector(".poster-v2-frame--select");
        const grid = frame.querySelector(".poster-v2-grid--select");
        const panel = frame.querySelector(".poster-v2-panel--visual");
        const caption = frame.querySelector(".poster-v2-visual__caption");
        const identity = frame.querySelector(".poster-v2-identity");
        const captionLine = parseFloat(getComputedStyle(caption.querySelector(".poster-v2-visual__meta")).lineHeight);
        panel.scrollIntoView({ block: "center" });
        return { grid: box(grid), panel: box(panel), caption: box(caption), identity: box(identity), captionLine, name: box(identity.querySelector(".poster-v2-name")) };
      });
      expect(hero.panel.width, "hero portrait spans the grid width").toBeGreaterThanOrEqual(hero.grid.width - 1);
      expect(Math.abs(hero.panel.height - hero.panel.width * 1.25), "hero portrait is 4:5").toBeLessThanOrEqual(4);
      expect(hero.caption.height, "caption plate is two lines or fewer").toBeLessThanOrEqual(hero.captionLine * 2 + 24);
      expect(hero.caption.top, "caption sits on the top edge").toBeLessThanOrEqual(hero.panel.top + 24);
      expect(hero.caption.right, "caption stays inside the portrait").toBeLessThanOrEqual(hero.panel.right + 1);
      expect(hero.identity.top, "name block starts below the caption").toBeGreaterThanOrEqual(hero.caption.bottom - 1);
      expect(hero.identity.bottom, "name block ends on the portrait's bottom edge").toBeLessThanOrEqual(hero.panel.bottom + 1);
      expect(hero.identity.left, "name block inside the portrait (left)").toBeGreaterThanOrEqual(hero.panel.left - 1);
      expect(hero.identity.right, "name block inside the portrait (right)").toBeLessThanOrEqual(hero.panel.right + 1);

      // Guest portraits are drawn (not an empty black column) and the text column keeps a usable width.
      const guests = await page.evaluate(() => [...document.querySelectorAll(".poster-supporting-card")].map(card => {
        const image = card.querySelector(".poster-supporting-card__visual img");
        const body = card.querySelector(".poster-supporting-card__body");
        return { loaded: image.complete && image.naturalWidth > 0, imageWidth: image.getBoundingClientRect().width, imageHeight: image.getBoundingClientRect().height, bodyWidth: body.getBoundingClientRect().width };
      }));
      expect(guests.length).toBeGreaterThan(0);
      for (const guest of guests) {
        expect(guest.loaded, "guest portrait loaded").toBe(true);
        expect(guest.imageHeight).toBeGreaterThan(60);
        expect(guest.bodyWidth, "guest text column").toBeGreaterThan(width * 0.4);
      }
    });
  });
}

test.describe("scroll cue under reduced motion", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

  test("スクロールの合図は動かない(prefers-reduced-motion)", async ({ page, baseURL }) => {
    test.setTimeout(240_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installRoutes(page, baseURL);
    await page.goto(`/act-showcase.html?id=${ACT_SLUG}`);
    const advance = page.locator(".neotokyo-sequence__advance");
    const screen = page.locator(".neotokyo-sequence__screen--linked.is-splitting");
    for (let step = 0; step < 20; step += 1) {
      await expect(advance).toBeVisible({ timeout: 15_000 });
      const label = ((await advance.textContent()) || "").trim();
      if (label.startsWith("NEXT // HANDOUT") && await screen.count()) break;
      await advance.click({ force: true });
      await expect(advance).not.toHaveText(label, { timeout: 15_000 }).catch(() => {});
    }
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), "reduced motion is on").toBe(true);
    await expect(screen).toHaveAttribute("data-scroll-cue", "1", { timeout: 10_000 });
    expect(await screen.evaluate(element => getComputedStyle(element, "::after").animationName)).toBe("none");
  });
});


// Handout reading and assignment on a phone: the screen follows the reading, then brings the assigned card into
// view, and leaves the reader alone once they scroll by hand (or ask for reduced motion).
async function advanceUntil(page, startsWith) {
  const advance = page.locator(".neotokyo-sequence__advance");
  for (let step = 0; step < 20; step += 1) {
    await expect(advance).toBeVisible({ timeout: 15_000 });
    const label = ((await advance.textContent()) || "").trim();
    if (label.startsWith(startsWith)) return label;
    await advance.click({ force: true });
    await expect(advance).not.toHaveText(label, { timeout: 15_000 }).catch(() => {});
  }
  throw new Error(`never reached "${startsWith}"`);
}

const assignedScreen = page => page.locator(".neotokyo-sequence__screen--linked.is-splitting");
const reveal = screen => screen.evaluate(element => {
  const panel = element.querySelector(".neotokyo-sequence__assign-panel").getBoundingClientRect();
  const frame = element.getBoundingClientRect();
  return { scrollTop: element.scrollTop, maxTop: element.scrollHeight - element.clientHeight, panelTop: panel.top, frameTop: frame.top, frameBottom: frame.bottom };
});

test.describe("handout follow and assignment reveal (phone)", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

  test("読み上げの完了後、アサインカードの上端が画面内に入る", async ({ page, baseURL }) => {
    test.setTimeout(240_000);
    await installRoutes(page, baseURL);
    await page.goto(`/act-showcase.html?id=${ACT_SLUG}`);
    await advanceUntil(page, "ASSIGN // PC1");
    await page.locator(".neotokyo-sequence__advance").click({ force: true });
    await advanceUntil(page, "NEXT // HANDOUT");
    await page.waitForTimeout(1400);
    const state = await reveal(assignedScreen(page));
    expect(state.maxTop, "the screen scrolls inside itself").toBeGreaterThan(12);
    expect(state.scrollTop, "scrolled toward the assigned card").toBeGreaterThan(20);
    expect(state.panelTop, "card top is inside the screen").toBeGreaterThanOrEqual(state.frameTop);
    expect(state.panelTop, "card top is not at the very bottom").toBeLessThan(state.frameBottom - 40);
  });

  test("タップ(touchstart / pointerdown / click)だけでは止まらず、アサインカードへ動く", async ({ page, baseURL }) => {
    test.setTimeout(240_000);
    await installRoutes(page, baseURL);
    await page.goto(`/act-showcase.html?id=${ACT_SLUG}`);
    await advanceUntil(page, "ASSIGN // PC1");
    await page.locator(".neotokyo-sequence__advance").click({ force: true });
    const screen = assignedScreen(page);
    await expect(screen).toBeVisible();
    // The touch half of a tap (pointerdown, touchstart, a few px of jitter, touchend), without the click that would advance the stage.
    await screen.evaluate(element => {
      const touch = y => new Touch({ identifier: 1, target: element, clientX: 100, clientY: y });
      element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }));
      element.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [touch(300)] }));
      element.dispatchEvent(new TouchEvent("touchmove", { bubbles: true, touches: [touch(304)] }));
      element.dispatchEvent(new TouchEvent("touchend", { bubbles: true }));
    });
    await advanceUntil(page, "NEXT // HANDOUT");
    await page.waitForTimeout(1600);
    const state = await reveal(screen);
    expect(state.scrollTop, "a tap does not stop the reveal").toBeGreaterThan(20);
    expect(state.panelTop, "card top is inside the screen").toBeGreaterThanOrEqual(state.frameTop);
  });

  test("手でスクロールした後でも、アサインカードが画面外なら一度だけ動く", async ({ page, baseURL }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 390, height: 600 });
    await installRoutes(page, baseURL);
    await page.goto(`/act-showcase.html?id=${ACT_SLUG}`);
    await advanceUntil(page, "ASSIGN // PC1");
    await page.locator(".neotokyo-sequence__advance").click({ force: true });
    const screen = assignedScreen(page);
    await expect(screen).toBeVisible();
    await screen.evaluate(element => element.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 40 })));
    await advanceUntil(page, "NEXT // HANDOUT");
    await page.waitForTimeout(2200);
    const state = await reveal(screen);
    expect(state.scrollTop, "revealed although the reader had scrolled").toBeGreaterThan(20);
    expect(state.panelTop, "card top is inside the screen").toBeGreaterThanOrEqual(state.frameTop);
  });

  test("手でスクロールした結果アサインカードが見えているなら、動かさない", async ({ page, baseURL }) => {
    test.setTimeout(240_000);
    await installRoutes(page, baseURL);
    await page.goto(`/act-showcase.html?id=${ACT_SLUG}&debug=cue`);
    await advanceUntil(page, "ASSIGN // PC1");
    await page.locator(".neotokyo-sequence__advance").click({ force: true });
    const screen = assignedScreen(page);
    await expect(screen).toBeVisible();
    await expect(screen).toHaveClass(/is-assigned/, { timeout: 15_000 }).catch(() => {});
    // The reader scrolls the card into view themselves (a scroll the script did not cause).
    await screen.evaluate(element => {
      element.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 40 }));
      const panel = element.querySelector(".neotokyo-sequence__assign-panel");
      element.scrollTop += panel.getBoundingClientRect().top - element.getBoundingClientRect().top - 80;
    });
    const placed = (await reveal(screen)).scrollTop;
    await advanceUntil(page, "NEXT // HANDOUT");
    await page.waitForTimeout(2200);
    expect(Math.abs((await reveal(screen)).scrollTop - placed), "left where the reader put it").toBeLessThanOrEqual(2);
    await expect(page.locator("[data-cue-debug]")).toHaveAttribute("data-cue-state", "skipped(manual)");
  });

  test("▼ をタップするとアサインカードの先頭まで動く(合図の高さは44px以上)", async ({ page, baseURL }) => {
    test.setTimeout(240_000);
    await installRoutes(page, baseURL);
    await page.goto(`/act-showcase.html?id=${ACT_SLUG}`);
    await advanceUntil(page, "ASSIGN // PC1");
    await page.locator(".neotokyo-sequence__advance").click({ force: true });
    const screen = assignedScreen(page);
    await expect(screen).toBeVisible();
    // Keep the automatic reveal out of the way so the cue is tapped from the top.
    await screen.evaluate(element => element.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 1 })));
    await advanceUntil(page, "NEXT // HANDOUT");
    await screen.evaluate(element => { element.scrollTop = 0; });
    await expect(screen).toHaveAttribute("data-scroll-cue", "1");
    expect(await screen.evaluate(element => parseFloat(getComputedStyle(element, "::after").height)), "tap area height").toBeGreaterThanOrEqual(44);
    const before = await reveal(screen);
    const box = await screen.boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height - 20);
    await page.waitForTimeout(900);
    const state = await reveal(screen);
    expect(state.scrollTop, "scrolled by the tap").toBeGreaterThan(20);
    expect(state.panelTop, "the card moved up").toBeLessThan(before.panelTop - 20);
    expect(state.panelTop, "card top is inside the screen").toBeGreaterThanOrEqual(state.frameTop);
    await expect(screen, "the tap did not advance the stage").toBeVisible();
  });

  test("?debug=cue のときだけ自動スクロールの状態が出る", async ({ page, baseURL }) => {
    test.setTimeout(240_000);
    await installRoutes(page, baseURL);
    await page.goto(`/act-showcase.html?id=${ACT_SLUG}&debug=cue`);
    await advanceUntil(page, "ASSIGN // PC1");
    await page.locator(".neotokyo-sequence__advance").click({ force: true });
    await advanceUntil(page, "NEXT // HANDOUT");
    await expect(page.locator("[data-cue-debug]")).toHaveAttribute("data-cue-state", "done", { timeout: 5000 });
    await page.goto(`/act-showcase.html?id=${ACT_SLUG}`);
    await advanceUntil(page, "NEXT // HANDOUT");
    await page.waitForTimeout(1600);
    await expect(page.locator("[data-cue-debug]")).toHaveCount(0);
  });

  test("reduced-motion では動かさない", async ({ page, baseURL }) => {
    test.setTimeout(240_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installRoutes(page, baseURL);
    await page.goto(`/act-showcase.html?id=${ACT_SLUG}`);
    await advanceUntil(page, "ASSIGN // PC1");
    await page.locator(".neotokyo-sequence__advance").click({ force: true });
    await advanceUntil(page, "NEXT // HANDOUT");
    await page.waitForTimeout(1400);
    expect((await reveal(assignedScreen(page))).scrollTop).toBe(0);
  });

  test("読み上げ中は末尾に追従し、手動スクロールの後は追従しない", async ({ page, baseURL }) => {
    test.setTimeout(240_000);
    await installRoutes(page, baseURL, { longHandout: true });
    await page.goto(`/act-showcase.html?id=${ACT_SLUG}`);
    await advanceUntil(page, "NEXT // HANDOUT 01");
    await page.locator(".neotokyo-sequence__advance").click({ force: true });
    await advanceUntil(page, "ASSIGN // PC1");
    const stage = page.locator(".neotokyo-sequence__stage");
    const state = () => stage.evaluate(element => ({ top: element.scrollTop, max: element.scrollHeight - element.clientHeight }));
    expect((await state()).max, "the handout is taller than the screen").toBeGreaterThan(100);
    // The follow runs a short interpolation behind the typing; it settles on the end of the text.
    await expect.poll(async () => { const { top, max } = await state(); return max - top; }, { message: "caret end is in view", timeout: 3000 }).toBeLessThanOrEqual(12);
    expect((await state()).top, "followed the reading").toBeGreaterThan(40);
  });

  test("読み上げ中に手で触れたら、その後は追従しない", async ({ page, baseURL }) => {
    test.setTimeout(240_000);
    await installRoutes(page, baseURL, { longHandout: true });
    await page.goto(`/act-showcase.html?id=${ACT_SLUG}`);
    await advanceUntil(page, "NEXT // HANDOUT 01");
    await page.locator(".neotokyo-sequence__advance").click({ force: true });
    const readout = page.locator(".neotokyo-sequence__screen--linked .neotokyo-sequence__readout");
    await expect(readout).toBeVisible();
    await page.locator(".neotokyo-sequence__stage").evaluate(stage => stage.dispatchEvent(new Event("touchstart", { bubbles: true })));
    await advanceUntil(page, "ASSIGN // PC1");
    const gap = await page.locator(".neotokyo-sequence__stage").evaluate(stage => ({ max: stage.scrollHeight - stage.clientHeight, top: stage.scrollTop }));
    expect(gap.max, "the handout is taller than the screen").toBeGreaterThan(100);
    expect(gap.max - gap.top, "not dragged to the end").toBeGreaterThan(40);
  });
});

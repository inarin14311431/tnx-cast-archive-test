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

async function installRoutes(page, origin) {
  const art = [1, 2, 3, 4].map(artPng);
  const data = {
    ...showcaseData,
    pageTitle: TITLE,
    actName: TITLE,
    casts: showcaseData.casts.map((cast, index) => ({
      ...cast,
      imageUrl: `${origin}/__art/${index}.png`,
      fullName: ["“ブルー・モーメント” 夜明けを駆け抜けるネオン街の運び屋", cast.fullName, cast.fullName][index],
      tagline: index === 0 ? "NEON-AFTERIMAGE-SIGNAL-CHASER" : cast.tagline,
      handout: { ...cast.handout, body: `${cast.handout.body}\nhttps://example.com/very/long/unbroken/url/for/the/handout/body/text` }
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

      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 500) {
        await page.evaluate(top => window.scrollTo(0, top), y);
        await page.waitForTimeout(150);
      }
      expect(await layoutOverflow(page, width), "final board").toBeLessThanOrEqual(0);

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

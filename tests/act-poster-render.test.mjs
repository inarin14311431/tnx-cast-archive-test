import test from "node:test";
import assert from "node:assert/strict";
import { buildPosterModel, layoutPoster, POSTER_RIGHTS_NOTICE, POSTER_COPYRIGHT_NOTICE } from "../js/act-poster-layout.js";
import {
  renderPoster, exportPosterBlob, loadPosterFonts, loadPosterImage, loadPosterImages, createPosterMeasurer, posterTexts,
  POSTER_PLACEHOLDER_URL, POSTER_FONTS, POSTER_MAX_PNG_BYTES, POSTER_JPEG_QUALITY, resolvePosterTheme
} from "../js/act-poster-render.js";

// The canvas side of the poster (js/act-poster-render.js) against a recording context: what is drawn, in which order and with which numbers.
// No real canvas is needed; the picture itself is checked by hand in a browser, not here.
const THEME = Object.freeze({ primary: "#70eaff", secondary: "#9a78ff", accent: "#ffbd68" });
const withDocument = async (document, run) => {
  const before = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { value: document, configurable: true, writable: true });
  try { return await run(); } finally {
    if (before) Object.defineProperty(globalThis, "document", before); else delete globalThis.document;
  }
};

function recordingCanvas(events = []) {
  const ctx = new Proxy({}, {
    get(target, name) {
      if (name === "createLinearGradient") return (...args) => { events.push(["createLinearGradient", ...args]); return { addColorStop() {} }; };
      if (name === "measureText") return text => ({ width: String(text).length * 10 });
      if (name in target) return target[name];
      return (...args) => { events.push([String(name), ...args]); };
    },
    set(target, name, value) { target[name] = value; return true; }
  });
  return { width: 0, height: 0, getContext: () => ctx, ctx, events };
}

const cast = (slot, fullName, imageUrl) => ({ slot, fullName, reading: "ヨミ", imageUrl, styles: [{ label: "カブト", handoutRole: true }, { label: "カゼ●" }], handout: { body: "ハンドアウト本文はここ" } });
const SHOWCASE = {
  actName: "NEON AFTERIMAGE", heroSubTitle: "ネオンの残像", rulerName: "稲荷秋", scenarioWriterName: "芳賀琉",
  guests: [{ name: "ゲスト名" }],
  casts: [cast("CAST 01", "“A” 甲", "https://example.test/a.png"), cast("CAST 02", "“B” 乙", "https://example.test/b.png"), cast("CAST 03", "“C” 丙", "")]
};
const modelOf = () => buildPosterModel(SHOWCASE, { date: "11.23 SUN 21:00〜", catchCopy: "一言" });
const layoutOf = model => layoutPoster(model, createPosterMeasurer(), { theme: THEME });
const A = { width: 600, height: 800, id: "a" };
const B = { width: 600, height: 800, id: "b" };
const PLACEHOLDER = { width: 600, height: 800, id: "placeholder" };

test("it draws 2400 x 1350 for the logical 1200 x 675 and starts with the dark ground over the whole picture", async () => {
  const canvas = recordingCanvas();
  const model = modelOf();
  await renderPoster(canvas, layoutOf(model), { images: new Map([["https://example.test/a.png", A], ["placeholder", PLACEHOLDER]]), theme: THEME });
  assert.equal(canvas.width, 2400);
  assert.equal(canvas.height, 1350);
  assert.deepEqual(canvas.events.find(event => event[0] === "setTransform"), ["setTransform", 2, 0, 0, 2, 0, 0]);
  assert.deepEqual(canvas.events.find(event => event[0] === "fillRect"), ["fillRect", 0, 0, 1200, 675]);
  await renderPoster(canvas, layoutOf(model), { images: new Map(), theme: THEME, scale: 1 });
  assert.equal(canvas.width, 1200);
});

test("each portrait is a HO-colour ground first, then its picture (the placeholder when there is none or it failed), clipped to its slanted shape", async () => {
  const canvas = recordingCanvas();
  const layout = layoutOf(modelOf());
  // cast 1 has a picture, cast 2's failed to load (no entry), cast 3 has no image URL
  await renderPoster(canvas, layout, { images: new Map([["https://example.test/a.png", A], ["placeholder", PLACEHOLDER]]), theme: THEME });
  const drawn = canvas.events.filter(event => event[0] === "drawImage");
  assert.deepEqual(drawn.map(event => event[1].id), ["a", "placeholder", "placeholder"]);
  const events = canvas.events;
  for (const index of events.map((event, position) => (event[0] === "drawImage" ? position : -1)).filter(position => position >= 0)) {
    const before = events.slice(0, index);
    const clip = before.map(event => event[0]).lastIndexOf("clip");
    assert.ok(clip >= 0 && events.slice(clip, index).some(event => event[0] === "createLinearGradient"), "the gradient ground comes after the clip and before the picture");
    assert.ok(events.slice(clip, index).some(event => event[0] === "fillRect"), "and it is painted before the picture");
  }
});

test("a picture covers its box with the top shown (object-position 50% 6%); the placeholder is moved up by about a fifth and shown across its width", async () => {
  const canvas = recordingCanvas();
  const layout = layoutOf(modelOf());
  await renderPoster(canvas, layout, { images: new Map([["https://example.test/a.png", A], ["placeholder", PLACEHOLDER]]), theme: THEME });
  const [own, , placeholder] = canvas.events.filter(event => event[0] === "drawImage");
  const first = layout.panels[0];
  const scale = Math.max(first.width / 600, first.height / 800);
  assert.ok(Math.abs(own[4] - 600 * scale) < 1e-9 && Math.abs(own[5] - 800 * scale) < 1e-9);
  assert.ok(Math.abs(own[2] - (first.x + (first.width - 600 * scale) / 2)) < 1e-9, "centered across");
  assert.ok(Math.abs(own[3] - (first.y + (first.height - 800 * scale) * 0.06)) < 1e-9, "top-aligned at 6%");
  const third = layout.panels[2];
  const fit = third.width / 600;
  assert.ok(Math.abs(placeholder[4] - 600 * fit) < 1e-9, "the placeholder's whole width");
  assert.ok(Math.abs(placeholder[3] - (third.y + (third.height - 800 * fit) * 0.06 - third.height * (85 / 392))) < 1e-9, "moved up by about 85px of 392");
  assert.ok(third.height * (85 / 392) > 80 && third.height * (85 / 392) < 90);
});

test("the placeholder is not lifted on a roster card, where no plate covers the foot", async () => {
  const canvas = recordingCanvas();
  const six = { ...SHOWCASE, casts: Array.from({ length: 6 }, (_, index) => cast(`CAST ${index + 1}`, `“N${index}” 名`, "")) };
  const layout = layoutOf(buildPosterModel(six));
  await renderPoster(canvas, layout, { images: new Map([["placeholder", PLACEHOLDER]]), theme: THEME });
  const [image] = canvas.events.filter(event => event[0] === "drawImage");
  const card = layout.panels[0];
  const fit = card.portrait.width / 600;
  assert.ok(Math.abs(image[3] - (card.y + (card.height - 800 * fit) * 0.06)) < 1e-9);
});

test("the text drawn is the model: names, readings, HO, styles, credits, date and the rights line - never the handout text or the guests", async () => {
  const canvas = recordingCanvas();
  const model = modelOf();
  await renderPoster(canvas, layoutOf(model), { images: new Map([["placeholder", PLACEHOLDER]]), theme: THEME });
  const texts = canvas.events.filter(event => event[0] === "fillText").map(event => event[1]);
  for (const expected of ["NEON AFTERIMAGE", "ネオンの残像", "HO1", "HO3", "カブト", "“A”", "甲", "RL", "稲荷秋", "WRITER", "芳賀琉", "11.23", "SUN 21:00〜", POSTER_RIGHTS_NOTICE, POSTER_COPYRIGHT_NOTICE]) {
    assert.ok(texts.includes(expected), `draws ${expected}`);
  }
  const all = texts.join("");
  assert.doesNotMatch(all, /ハンドアウト本文|ゲスト|カゼ/);
  assert.equal(Array.from("一言").every(char => texts.includes(char)), true, "the catch line is drawn letter by letter");
});

test("the fonts are awaited before anything is drawn: Dela Gothic One, Noto Sans JP (700 / 900) and Orbitron, for the characters used", async () => {
  const loads = [];
  const canvas = recordingCanvas();
  const model = modelOf();
  await withDocument({ fonts: { load: async (font, text) => { loads.push({ font, text, drawnBefore: canvas.events.length }); return []; } } }, () =>
    renderPoster(canvas, layoutOf(model), { images: new Map(), theme: THEME, texts: posterTexts(model) }));
  assert.ok(loads.length >= 4);
  assert.ok(loads.every(load => load.drawnBefore === 0), "nothing was drawn when the fonts were requested");
  const fonts = loads.map(load => load.font).join("|");
  assert.match(fonts, /Dela Gothic One/);
  assert.match(fonts, /900 \d+px "Noto Sans JP"/);
  assert.match(fonts, /700 \d+px "Noto Sans JP"/);
  assert.match(fonts, /Orbitron/);
  assert.ok(loads.some(load => load.text.includes("NEON AFTERIMAGE")), "the title's characters are asked for");
  assert.ok(loads.some(load => load.text.includes("ヨミ") && load.text.includes("稲荷秋")), "the Japanese text is asked for");
  assert.ok(POSTER_FONTS.title.startsWith('"Dela Gothic One"'));
  await loadPosterFonts(); // no document: nothing to wait for, no error
});

test("an image is read with fetch + createImageBitmap; when both fail it is null (the placeholder is drawn); the placeholder is the asset of the site", async () => {
  const calls = [];
  const stubs = { fetch: globalThis.fetch, createImageBitmap: globalThis.createImageBitmap };
  try {
    globalThis.fetch = async (url, options) => { calls.push([url, options]); return { ok: true, blob: async () => ({ blob: url }) }; };
    globalThis.createImageBitmap = async blob => ({ bitmap: blob.blob, width: 1, height: 1 });
    const picture = await loadPosterImage("https://example.test/a.png#focus");
    assert.deepEqual(calls[0], ["https://example.test/a.png", { mode: "cors" }]);
    assert.equal(picture.bitmap, "https://example.test/a.png");
    assert.equal(await loadPosterImage(""), null);
    globalThis.fetch = async () => ({ ok: false, status: 403 });
    assert.equal(await loadPosterImage("https://example.test/denied.png"), null, "no fetch, and no <img> fallback without a DOM");
    globalThis.fetch = async (url) => ({ ok: true, blob: async () => ({ blob: url }) });
    const layout = layoutOf(modelOf());
    const images = await loadPosterImages(layout);
    assert.deepEqual([...images.keys()].sort(), ["https://example.test/a.png", "https://example.test/b.png", "placeholder"]);
    assert.equal(images.get("placeholder").bitmap, POSTER_PLACEHOLDER_URL);
  } finally {
    Object.assign(globalThis, stubs);
  }
  assert.match(POSTER_PLACEHOLDER_URL, /\/assets\/placeholders\/scan-failed\.webp$/);
});

test("the picture is exported as PNG; over 5 MB as JPEG at quality 0.9", async () => {
  const asked = [];
  const canvasOf = size => ({ convertToBlob: async options => { asked.push(options); return { size: options.type === "image/png" ? size : 100, type: options.type }; } });
  const small = await exportPosterBlob(canvasOf(1000));
  assert.equal(small.type, "image/png");
  assert.equal(asked.length, 1);
  asked.length = 0;
  const big = await exportPosterBlob(canvasOf(POSTER_MAX_PNG_BYTES + 1));
  assert.equal(big.type, "image/jpeg");
  assert.deepEqual(asked.map(options => options.type), ["image/png", "image/jpeg"]);
  assert.equal(asked[1].quality, POSTER_JPEG_QUALITY);
  assert.equal(POSTER_JPEG_QUALITY, 0.9);
  assert.equal(POSTER_MAX_PNG_BYTES, 5 * 1024 * 1024);
  const exactly = await exportPosterBlob(canvasOf(POSTER_MAX_PNG_BYTES));
  assert.equal(exactly.type, "image/png", "exactly 5 MB stays PNG");
  // an HTMLCanvasElement: toBlob
  const element = { toBlob: (done, type, quality) => done({ size: 10, type, quality }) };
  assert.equal((await exportPosterBlob(element)).type, "image/png");
});

test("without a canvas the measurer falls back to an estimate instead of failing", () => {
  const measure = createPosterMeasurer();
  assert.equal(typeof measure("ABC", 20, 700, "title"), "number");
  assert.ok(measure("ABC", 20) > 0);
});

test("the clipboard always gets PNG: png:true skips the JPEG fallback even over 5 MB", async () => {
  const asked = [];
  const canvas = { convertToBlob: async options => { asked.push(options.type); return { size: POSTER_MAX_PNG_BYTES * 2, type: options.type }; } };
  const blob = await exportPosterBlob(canvas, { png: true });
  assert.equal(blob.type, "image/png");
  assert.deepEqual(asked, ["image/png"]);
});

test("the theme colours are resolved by the browser: any CSS colour becomes what the computed style says", async () => {
  const seen = [];
  const document = { createElement: () => ({ style: {}, remove() {} }) };
  const before = Object.getOwnPropertyDescriptor(globalThis, "getComputedStyle");
  globalThis.getComputedStyle = probe => { seen.push(probe.style.color); return { color: `rgb(${seen.length}, 0, 0)` }; };
  try {
    const theme = await withDocument(document, () => resolvePosterTheme({ primary: "#70eaff", secondary: "color-mix(in srgb, red 50%, blue)", accent: "hsl(30 90% 60%)" }, { append() {} }));
    assert.equal(theme.primary, "rgb(1, 0, 0)");
    assert.equal(theme.secondary, "rgb(2, 0, 0)");
    assert.equal(theme.accent, "rgb(3, 0, 0)");
    assert.deepEqual(seen, ["#70eaff", "color-mix(in srgb, red 50%, blue)", "hsl(30 90% 60%)"]);
  } finally {
    if (before) Object.defineProperty(globalThis, "getComputedStyle", before); else delete globalThis.getComputedStyle;
  }
});

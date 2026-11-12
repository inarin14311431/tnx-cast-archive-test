import { test, expect } from "@playwright/test";

// モバイル編集の「09 キャスト画像」: 保存済みの拡大率(--tnx-image-scale、100〜200%)が100%を超えても、画像は枠(.mobile-image-display)の
// 内側に収まり、下の「タップして画像を編集」と、その下の文言に重ならない。ログイン不要: 本物のCSSを、同じ作りのマークアップに当てて測る。
const PICTURE = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#c04a8a"/></svg>')}`;

async function mount(page, scale) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body data-page="sheet-mobile.html" style="margin:0;--color-surface:#0b141a;--color-border-muted:#355;--mobile-section-accent:#c8a">
      <section style="padding:12px"><button id="open" class="mobile-image-display" type="button" aria-haspopup="dialog"><img id="main" src="${PICTURE}" alt="" style="--tnx-image-scale:${scale};--tnx-image-origin:50% 0%"><span>タップして画像を編集</span></button>
      <p id="after" style="margin:16px 0 400px">画像の下の文言</p></section></body></html>`);
  await page.addStyleTag({ path: new URL("../../css-next/pages/sheet-mobile-image.css", import.meta.url).pathname });
  await page.locator("#main").evaluate(image => image.decode());
}

for (const percent of [100, 150, 200]) {
  test(`拡大率 ${percent}%: 画像は枠の外へ出ず、下の文言とページの横幅を侵さない`, async ({ page }) => {
    await mount(page, percent / 100);
    const result = await page.evaluate(() => {
      const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2 }; };
      const open = document.querySelector("#open");
      const frame = box(open);
      const span = box(open.querySelector("span"));
      const after = box(document.querySelector("#after"));
      // what is painted under a point: the clipped image never reaches outside the button, so these points belong to other elements
      const topmost = (x, y) => document.elementFromPoint(x, y);
      return {
        overflow: getComputedStyle(open).overflow,
        horizontal: document.documentElement.scrollWidth - innerWidth,
        belowIsText: topmost(after.cx, after.cy)?.id === "after",
        rightOfFrame: topmost(Math.min(innerWidth - 1, frame.right + 2), frame.top + 40)?.id === "main",
        captionOnTop: topmost(span.cx, span.cy)?.tagName === "SPAN",
        captionRowOnTop: topmost(frame.left + 8, span.cy)?.tagName === "SPAN",
        captionBelowImageArea: span.top >= frame.top + 100
      };
    });
    expect(result.overflow).toBe("hidden");
    expect(result.horizontal).toBeLessThanOrEqual(0);
    expect(result.belowIsText).toBe(true);
    expect(result.rightOfFrame).toBe(false);
    expect(result.captionOnTop).toBe(true);
    expect(result.captionRowOnTop).toBe(true);
    expect(result.captionBelowImageArea).toBe(true);
  });
}

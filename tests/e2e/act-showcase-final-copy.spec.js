import { test, expect } from "@playwright/test";

const showcase = {
  version: 2,
  pageTitle: "FINAL COPY E2E",
  heroTitle: "TOKYO N◎VA THE AXLERATION",
  heroSubTitle: "E2E FINAL COPY",
  actName: "E2E FINAL COPY",
  rulerName: "E2E RULER",
  background: "",
  trailer: { title: "ACT TRAILER", body: "テスト用アクトトレーラー。" },
  casts: [{
    slot: "CAST 01",
    serial: "E2E-COPY-01",
    fullName: "E2E CAST",
    reading: "イーツーイー キャスト",
    tagline: "FINAL COPY TEST",
    imageUrl: "",
    imageAlt: "E2E CAST",
    styles: [{ label: "カブト◎", handoutRole: true }],
    meta: [],
    handout: { title: "カブト用ハンドアウト", body: "最終文言テスト。" },
    link: { disabled: true, href: "", text: "" }
  }]
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "apikey, authorization, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
  "content-type": "application/json"
};

async function mockRpc(route, body) {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    return;
  }
  await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(body) });
}

test("アクセス画面の3行とNODEラベルは書き換え前の文言を一度も出さない", async ({ page }) => {
  test.setTimeout(30_000);
  // The observer is installed before any page script runs, so it sees every text the page ever
  // puts into these elements, including a draft that is overwritten in a later microtask.
  await page.addInitScript(() => {
    const seen = { eyebrow: new Set(), title: new Set(), sub: new Set(), node: new Set() };
    window.__accessCopySeen = seen;
    const scan = () => {
      const opening = document.querySelector(".neotokyo-sequence__screen--opening");
      const read = (scope, selector, bucket) => {
        for (const element of scope?.querySelectorAll(selector) || []) seen[bucket].add((element.textContent || "").trim());
      };
      read(opening, ".neotokyo-sequence__eyebrow", "eyebrow");
      read(opening, ".neotokyo-sequence__opening-title", "title");
      read(opening, ".neotokyo-sequence__opening-sub", "sub");
      read(document, ".neotokyo-sequence__system span", "node");
    };
    new MutationObserver(scan).observe(document, { subtree: true, childList: true, characterData: true });
  });

  await page.route("**/rest/v1/rpc/get_public_act_showcase", route => mockRpc(route, showcase));
  await page.route("**/rest/v1/rpc/get_public_act_showcase_guests", route => mockRpc(route, []));
  await page.goto("/act-showcase.html?id=e2e-final-copy", { waitUntil: "domcontentloaded" });

  // The access screen lasts a few seconds; the first NEXT button means it has been replaced.
  await expect(page.locator(".neotokyo-sequence__advance")).toHaveText("NEXT // ACT TRAILER", { timeout: 15_000 });
  const seen = await page.evaluate(() => Object.fromEntries(Object.entries(window.__accessCopySeen).map(([key, set]) => [key, [...set]])));

  expect(seen.eyebrow).toEqual(["01 // N◎VA MUNICIPAL DATABASE"]);
  expect(seen.title).toEqual(["ACT FILE // ACCESS"]);
  expect(seen.sub).toEqual(["ESTABLISHING PUBLIC SESSION"]);
  expect(seen.node).toContain("NODE // TOKYO N◎VA");
  for (const text of Object.values(seen).flat()) expect(text).not.toMatch(/NEOTOKYO|SYSTEM ACCESS/i);
});

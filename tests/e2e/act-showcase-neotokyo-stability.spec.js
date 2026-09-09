import { test, expect } from "@playwright/test";

const showcase = {
  version: 2,
  pageTitle: "E2E ACT SHOWCASE",
  heroTitle: "TOKYO N◎VA THE AXLERATION",
  heroSubTitle: "CAST SHOWCASE",
  actName: "E2E OBSERVER STABILITY",
  rulerName: "E2E RULER",
  background: "",
  trailer: {
    title: "ACT TRAILER",
    body: "夜のN◎VAに警報が響く。\nキャストはそれぞれの理由で事件へ向かう。"
  },
  casts: [
    {
      slot: "CAST 01",
      serial: "E2E-CAST-01",
      fullName: "“E2E” テスト・キャスト",
      reading: "テスト キャスト",
      tagline: "進行監視テスト",
      imageUrl: "",
      imageAlt: "E2Eテストキャスト",
      styles: [
        { label: "カブト◎", handoutRole: true },
        { label: "トーキー●", handoutRole: false },
        { label: "ニューロ", handoutRole: false }
      ],
      meta: [
        { label: "PLAYER", value: "E2E" },
        { label: "AFFILIATION", value: "TEST NODE" },
        { label: "AGE", value: "20" },
        { label: "GENDER / ID", value: "— / E2E" }
      ],
      handout: {
        title: "『カブト』用ハンドアウト",
        body: "推奨スタイル：カブト\nコネ：テスト対象　推奨スート：理性\n事件の目撃者を守り、真相へ辿り着け。\nPS：目撃者を守る"
      },
      link: { disabled: true, href: "", text: "" }
    }
  ]
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

async function registerShowcaseRoutes(page, body = showcase) {
  await page.route("**/rest/v1/rpc/get_public_act_showcase", route => mockRpc(route, body));
  await page.route("**/rest/v1/rpc/get_public_act_showcase_guests", route => mockRpc(route, []));
}

test("NeoTokyo showcase remains responsive through title, trailer, assignment and ACT READY", async ({ page }) => {
  test.setTimeout(45_000);
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  // This test validates sequence/state stability, not decorative motion. Running it
  // with reduced motion prevents continuously animated CTAs from making Playwright's
  // actionability check depend on a single animation frame while preserving the full flow.
  await page.emulateMedia({ reducedMotion: "reduce" });

  await registerShowcaseRoutes(page);

  await page.goto("/act-showcase.html?id=e2e-observer-stability&bgSample=neotokyo", { waitUntil: "domcontentloaded" });

  const intro = page.locator("#cinematic-intro");
  const advance = page.locator(".neotokyo-sequence__advance");
  await expect(intro).toHaveAttribute("aria-hidden", "false", { timeout: 8_000 });

  await expect(advance).toBeVisible({ timeout: 12_000 });
  await expect(advance).toHaveText("NEXT // ACT TRAILER");
  await advance.click();

  await expect(advance).toHaveText("NEXT // HANDOUT 01", { timeout: 12_000 });
  await expect(advance).toBeVisible();
  await advance.click();

  await expect(advance).toHaveText("ASSIGN // PC1", { timeout: 12_000 });
  await expect(advance).toBeVisible();
  await advance.click();

  await expect(advance).toHaveText("NEXT // ACT SUMMARY", { timeout: 12_000 });
  await expect(advance).toBeVisible();

  const responsive = await page.evaluate(() => new Promise(resolve => {
    window.setTimeout(() => resolve("responsive"), 120);
  }));
  expect(responsive).toBe("responsive");
  await expect(page.locator(".neotokyo-sequence__cast--linked .is-role-primary")).toHaveCount(1);

  await advance.click();
  await expect(advance).toBeHidden({ timeout: 12_000 });
  const access = page.locator(".neotokyo-finale__access-button");
  await expect(access).toBeVisible({ timeout: 12_000 });
  await expect(access).toContainText("OPEN FULL SHOWCASE");
  await access.click();

  await expect(intro).toHaveAttribute("aria-hidden", "true", { timeout: 8_000 });
  await expect(page.locator("#act-showcase-root")).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("ACT TRAILER moves the stage scroll position while typing a long trailer", async ({ page }) => {
  test.setTimeout(35_000);
  const longTrailer = Array.from({ length: 72 }, (_, index) =>
    `${String(index + 1).padStart(2, "0")} // 夜のN◎VAを走るシグナルが、次の事件へキャストを導く。`
  ).join("\n");
  const longShowcase = {
    ...showcase,
    trailer: {
      ...showcase.trailer,
      body: longTrailer
    }
  };

  await registerShowcaseRoutes(page, longShowcase);
  await page.goto("/act-showcase.html?id=e2e-trailer-scroll&bgSample=neotokyo", { waitUntil: "domcontentloaded" });

  const intro = page.locator("#cinematic-intro");
  const advance = page.locator(".neotokyo-sequence__advance");
  const stage = page.locator(".neotokyo-sequence__stage");

  await expect(intro).toHaveAttribute("aria-hidden", "false", { timeout: 8_000 });
  await expect(advance).toHaveText("NEXT // ACT TRAILER", { timeout: 12_000 });
  await advance.click();

  await expect(stage).toHaveClass(/is-trailer-scroll/, { timeout: 5_000 });
  await expect.poll(async () => stage.evaluate(element => {
    const maxScroll = element.scrollHeight - element.clientHeight;
    return maxScroll > 20 && element.scrollTop > 5;
  }), { timeout: 8_000, intervals: [150, 250, 400] }).toBe(true);

  const ownership = await stage.evaluate(element => {
    const screen = element.querySelector(".neotokyo-sequence__screen--trailer");
    const readout = element.querySelector(".neotokyo-sequence__screen--trailer .neotokyo-sequence__readout");
    return {
      stageOverflow: getComputedStyle(element).overflowY,
      screenOverflow: screen ? getComputedStyle(screen).overflowY : "missing",
      readoutOverflow: readout ? getComputedStyle(readout).overflowY : "missing"
    };
  });
  expect(ownership.stageOverflow).toBe("auto");
  expect(ownership.screenOverflow).toBe("visible");
  expect(ownership.readoutOverflow).toBe("visible");
});
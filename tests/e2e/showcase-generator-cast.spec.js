import { test, expect } from "@playwright/test";
import { installShowcaseGeneratorMock, MOCK_PUBLIC_CASTS, MOCK_PRIVATE_CASTS } from "./fixtures/showcase-generator-mock.mjs";

// The cast section: order rows, the add box (tabs, filters, cards, the manual form) and the guest cards.

async function openGenerator(page, options = {}) {
  await page.route("**/*", route => {
    const { hostname } = new URL(route.request().url());
    return hostname === "127.0.0.1" || hostname === "localhost" ? route.fallback() : route.abort();
  });
  const calls = await installShowcaseGeneratorMock(page, {
    rpc: { publish_act_showcase_for_current_user: "act-mock-id", replace_act_showcase_guests_for_current_user: null, ...options.rpc },
    ...options
  });
  await page.goto(`/showcase-generator.html${options.query || ""}`);
  await expect(page.locator("html")).toHaveAttribute("data-showcase-generator-state", "ready", { timeout: 15_000 });
  await expect(page.locator("#public-cast-grid [data-public-character-id]").first()).toBeVisible();
  return calls;
}

const card = (page, index) => page.locator(`[data-public-character-id="${MOCK_PUBLIC_CASTS[index].id}"]`);
const row = (page, index) => page.locator(`#selected-casts [data-selected-index="${index}"]`);
const names = page => page.locator("#selected-casts .cast-row__name").allTextContents();

async function addCasts(page, ...indexes) {
  for (const index of indexes) await card(page, index).click();
}

test("a picked cast becomes a row with its thumbnail, identity, handout state and the card says it is added", async ({ page }) => {
  await openGenerator(page);
  await expect(card(page, 0)).toHaveAttribute("aria-pressed", "false");
  await card(page, 0).click();
  await expect(card(page, 0)).toHaveAttribute("aria-pressed", "true");
  await expect(card(page, 0).locator(".cast-pick-card__order")).toHaveText("追加済み");
  const first = row(page, 0);
  await expect(first.locator(".cast-row__name")).toHaveText("テストキャスト1");
  await expect(first.locator(".cast-row__handle")).toHaveText("“ハンドル1”");
  await expect(first.locator(".cast-row__styles")).toContainText("カタナ◎");
  await expect(first.locator("[data-cast-slot-label]")).toHaveText("CAST 01");
  await expect(first.locator("img.cast-row__thumb")).toHaveAttribute("src", /scan-failed|\.(png|webp|jpg)/);
  await expect(first.locator("[data-handout-badge]")).toHaveAttribute("data-state", "empty");
  await expect(first.locator("[data-handout-badge]")).toHaveText("ハンドアウト 未入力");
  await expect(page.locator("#cast-order-count")).toHaveText("1");
  await expect(page.locator("#selected-count")).toHaveText("1");
});

test("the handout panel opens from its button, keeps its fields and the badge follows the text", async ({ page }) => {
  await openGenerator(page);
  await addCasts(page, 0);
  const first = row(page, 0);
  const toggle = first.locator('[data-action="toggle"]');
  const panel = first.locator(".cast-row__panel");
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(panel).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  for (const field of ["cast-no", "quote", "tagline", "description"]) await expect(first.locator(`[data-field="${field}"]`)).toBeVisible();
  await first.locator('[data-field="description"]').fill("ハンドアウトの本文");
  await expect(first.locator("[data-handout-badge]")).toHaveAttribute("data-state", "done");
  await expect(first.locator("[data-handout-badge]")).toHaveText("ハンドアウト 入力済み");
  await first.locator('[data-field="description"]').fill("");
  await expect(first.locator("[data-handout-badge]")).toHaveAttribute("data-state", "empty");
  // The open state survives a re-render (adding another cast).
  await first.locator('[data-field="tagline"]').fill("残る一言");
  await addCasts(page, 1);
  await expect(row(page, 0).locator(".cast-row__panel")).toBeVisible();
  await expect(row(page, 0).locator('[data-field="tagline"]')).toHaveValue("残る一言");
});

test("reordering moves each cast with its own tagline, handout and role: buttons, keyboard and drag", async ({ page }) => {
  await openGenerator(page);
  await addCasts(page, 0, 1, 2);
  for (const [index, text] of [[0, "A"], [1, "B"], [2, "C"]]) {
    await row(page, index).locator('[data-action="toggle"]').click();
    await row(page, index).locator('[data-field="tagline"]').fill(`一言${text}`);
    await row(page, index).locator('[data-field="description"]').fill(`本文${text}`);
    await row(page, index).locator('[data-field="quote"]').selectOption("共通");
  }
  const state = async () => page.evaluate(() => [...document.querySelectorAll("#selected-casts [data-selected-index]")].map(r => [
    r.querySelector(".cast-row__name").textContent,
    r.querySelector('[data-field="tagline"]').value,
    r.querySelector('[data-field="description"]').value
  ]));
  expect(await state()).toEqual([["テストキャスト1", "一言A", "本文A"], ["テストキャスト2", "一言B", "本文B"], ["テストキャスト3", "一言C", "本文C"]]);

  await row(page, 0).locator('[data-action="down"]').click();
  expect(await state()).toEqual([["テストキャスト2", "一言B", "本文B"], ["テストキャスト1", "一言A", "本文A"], ["テストキャスト3", "一言C", "本文C"]]);
  await expect(row(page, 0).locator('[data-action="up"]')).toBeDisabled();
  await expect(row(page, 2).locator('[data-action="down"]')).toBeDisabled();

  // Keyboard: the grip of the last row, arrow up.
  await row(page, 2).locator('[data-action="grip"]').focus();
  await page.keyboard.press("ArrowUp");
  expect(await state()).toEqual([["テストキャスト2", "一言B", "本文B"], ["テストキャスト3", "一言C", "本文C"], ["テストキャスト1", "一言A", "本文A"]]);
  await expect(row(page, 1).locator('[data-action="grip"]')).toBeFocused();

  // Drag: the first row's grip onto the lower half of the last row (the panels are closed so all rows are on screen).
  for (let index = 0; index < 3; index += 1) await row(page, index).locator('[data-action="toggle"]').click();
  const target = await row(page, 2).boundingBox();
  await row(page, 0).locator('[data-action="grip"]').dragTo(row(page, 2), { targetPosition: { x: 40, y: target.height - 6 } });
  expect(await state()).toEqual([["テストキャスト3", "一言C", "本文C"], ["テストキャスト1", "一言A", "本文A"], ["テストキャスト2", "一言B", "本文B"]]);
  await expect(row(page, 0).locator("[data-cast-slot-label]")).toHaveText("CAST 01");
});

test("the generated cards keep the order and the tagline of each cast after reordering", async ({ page }) => {
  await openGenerator(page);
  await addCasts(page, 0, 1);
  for (const [index, text] of [[0, "A"], [1, "B"]]) {
    await row(page, index).locator('[data-action="toggle"]').click();
    await row(page, index).locator('[data-field="tagline"]').fill(`一言${text}`);
    await row(page, index).locator('[data-field="quote"]').selectOption("共通");
  }
  await row(page, 0).locator('[data-action="down"]').click();
  await page.locator("#open-html-export").click();
  await expect(page.locator("#html-export-status")).toContainText("HTMLを生成しました", { timeout: 15_000 });
  const cards = page.frameLocator("#showcase-preview").locator(".cast-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0).locator(".cast-card__name")).toContainText("テストキャスト2");
  await expect(cards.nth(0).locator(".cast-card__tagline")).toContainText("一言B");
  await expect(cards.nth(1).locator(".cast-card__name")).toContainText("テストキャスト1");
  await expect(cards.nth(1).locator(".cast-card__tagline")).toContainText("一言A");
});

test("removing a row frees its card, and the limit is six", async ({ page }) => {
  const publicCasts = Array.from({ length: 7 }, (_, index) => ({ ...MOCK_PUBLIC_CASTS[0], id: `00000000-0000-4000-8000-0000000001${index}`, public_id: `TNX-LIM00${index}`, character_name: `上限${index}` }));
  await openGenerator(page, { publicCasts });
  for (let index = 0; index < 6; index += 1) await page.locator(`[data-public-character-id="${publicCasts[index].id}"]`).click();
  await expect(page.locator("#cast-order-count")).toHaveText("6");
  await expect(page.locator(`[data-public-character-id="${publicCasts[6].id}"]`)).toBeDisabled();
  await expect(page.locator("#add-manual-cast")).toBeDisabled();
  await row(page, 0).locator('[data-action="remove"]').click();
  await expect(page.locator("#cast-order-count")).toHaveText("5");
  await expect(page.locator(`[data-public-character-id="${publicCasts[0].id}"]`)).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(`[data-public-character-id="${publicCasts[6].id}"]`)).toBeEnabled();
});

test("the add box has public and private tabs, one list at a time, one set of filters", async ({ page }) => {
  await openGenerator(page);
  const publicTab = page.locator("#cast-source-public");
  const privateTab = page.locator("#cast-source-private");
  await expect(publicTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#public-cast-grid")).toBeVisible();
  await expect(page.locator("#owned-private-cast-grid")).toBeHidden();
  await privateTab.click();
  await expect(privateTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#public-cast-grid")).toBeHidden();
  await expect(page.locator("#owned-private-cast-grid")).toBeVisible();
  await expect(page.locator(".cast-source-panel__note")).toContainText("HTMLの書き出しだけできます");

  // The search narrows the private list too.
  await page.locator("#cast-search").fill("存在しない名前");
  await expect(page.locator("#owned-private-cast-grid")).toContainText("条件に一致する非公開キャストはいません");
  await page.locator("#cast-search").fill("");
  await page.locator(`[data-private-character-id="${MOCK_PRIVATE_CASTS[0].id}"]`).click();
  await expect(page.locator(`[data-private-character-id="${MOCK_PRIVATE_CASTS[0].id}"] .cast-pick-card__order`)).toHaveText("追加済み");
  await expect(page.locator("#private-selected-count")).toHaveText("1");
  await expect(row(page, 0)).toHaveAttribute("data-visibility", "private");
  await expect(row(page, 0).locator(".selected-cast__privacy")).toContainText("公開不可");

  await publicTab.click();
  await expect(page.locator("#public-cast-grid")).toBeVisible();
  await page.locator("#cast-search").fill("テストキャスト3");
  await expect(page.locator("#public-cast-grid .cast-pick-card")).toHaveCount(1);
  await page.locator("#cast-search").fill("");
  await page.locator("#player-filter").selectOption("PLAYER 2");
  await expect(page.locator("#public-cast-grid .cast-pick-card")).toHaveCount(1);
});

test("the manual form opens in place, needs a name, adds a row and keeps the rest for the row", async ({ page }) => {
  await openGenerator(page);
  const form = page.locator("#manual-cast-form");
  const open = page.locator("#add-manual-cast");
  await expect(form).toBeHidden();
  await open.click();
  await expect(form).toBeVisible();
  await expect(open).toHaveAttribute("aria-expanded", "true");
  await expect(form).toContainText("参加履歴と経験点は付きません");
  await expect(form).toContainText("ハンドアウトは追加したあとに出演順の行から入力できます");
  await expect(form.locator("details.manual-cast-form__more")).toBeVisible();
  await expect(form.locator('[data-manual-new="affiliation"]')).toBeHidden();

  // A name is required.
  await form.locator('button[type="submit"]').click();
  await expect(page.locator("#manual-cast-form-status")).toHaveText("キャスト名を入力してください。");
  await expect(page.locator("#selected-casts .cast-row")).toHaveCount(0);

  await form.locator('[data-manual-new="handle"]').fill("ブルー・モーメント");
  await form.locator('[data-manual-new="name"]').fill("手動の名前");
  await form.locator('[data-manual-new="styles"]').fill("カブト◎ / フェイト●");
  await form.locator('[data-manual-new="player"]').fill("手動PL");
  await form.locator("details.manual-cast-form__more > summary").click();
  await form.locator('[data-manual-new="affiliation"]').fill("所属X");
  await form.locator('button[type="submit"]').click();

  await expect(form).toBeHidden();
  const manual = row(page, 0);
  await expect(manual).toHaveAttribute("data-manual", "true");
  await expect(manual.locator(".cast-row__handle")).toHaveText("“ブルー・モーメント”");
  await expect(manual.locator(".cast-row__name")).toHaveText("手動の名前");
  await expect(manual.locator(".cast-row__styles")).toHaveText("カブト◎ / フェイト●");
  await expect(manual.locator(".cast-row__player")).toHaveText("PL：手動PL");
  // The new row opens its panel, and the details typed in the form are in the row's identity fields.
  await expect(manual.locator(".cast-row__panel")).toBeVisible();
  await expect(manual.locator('[data-field="manual-name"]')).toHaveValue("手動の名前");
  await expect(manual.locator('[data-field="manual-affiliation"]')).toHaveValue("所属X");
  await expect(manual.locator('[data-field="description"]')).toBeFocused();
  // The form is empty the next time.
  await open.click();
  await expect(form.locator('[data-manual-new="name"]')).toHaveValue("");

  // Editing the row's identity updates the row's header live.
  await manual.locator('[data-field="manual-name"]').fill("直した名前");
  await expect(manual.locator(".cast-row__name")).toHaveText("直した名前");
  await form.locator('button[type="button"]#cancel-manual-cast').click();
  await expect(form).toBeHidden();
});

test("a manual cast can be published as part of the HTML export with its handle", async ({ page }) => {
  await openGenerator(page);
  await page.locator("#add-manual-cast").click();
  await page.locator('[data-manual-new="handle"]').fill("手動ハンドル");
  await page.locator('[data-manual-new="name"]').fill("手動キャスト");
  await page.locator('#manual-cast-form button[type="submit"]').click();
  await page.locator('#selected-casts [data-field="quote"]').fill("共通");
  await page.locator("#open-html-export").click();
  await expect(page.locator("#html-export-status")).toContainText("HTMLを生成しました", { timeout: 15_000 });
  const cardName = page.frameLocator("#showcase-preview").locator(".cast-card__name");
  await expect(cardName).toContainText("手動ハンドル");
  await expect(cardName).toContainText("手動キャスト");
});

test("a saved act restores into rows: each cast keeps its tagline, handout and role", async ({ page }) => {
  const [first, second] = MOCK_PUBLIC_CASTS;
  const { obfuscatePublicId } = await import("../../js/showcase-restore-matching.js");
  const saved = {
    slug: "cast-restore",
    actName: "復元アクト",
    rulerName: "",
    showcaseData: {
      version: 2, pageTitle: "ACT CAST FILE", actName: "復元アクト", rulerName: "",
      casts: [
        { serial: obfuscatePublicId(second.public_id), fullName: "ハンドル2 テストキャスト2", styles: [{ label: "カタナ◎", handoutRole: true }], meta: [], tagline: "“二番目の一言”", handout: { title: "『カタナ』用ハンドアウト", body: "二番目の本文" } },
        { serial: "PRIVATE", fullName: "復元用手動", styles: [{ label: "カブト◎", handoutRole: true }], meta: [], tagline: "“手動の一言”", handout: { title: "共通ハンドアウト", body: "手動の本文" } },
        { serial: obfuscatePublicId(first.public_id), fullName: "ハンドル1 テストキャスト1", styles: [{ label: "カゼ●", handoutRole: true }], meta: [], tagline: "“一番目の一言”", handout: { title: "『カゼ』用ハンドアウト", body: "一番目の本文" } }
      ]
    },
    participants: [
      { characterId: first.id, characterPublicId: first.public_id, castOrder: 3, participationRole: "カゼ" },
      { characterId: second.id, characterPublicId: second.public_id, castOrder: 1, participationRole: "カタナ" }
    ]
  };
  await openGenerator(page, {
    query: `?edit=${saved.slug}`,
    ownedActs: [{ slug: saved.slug, act_name: saved.actName, ruler_name: "", showcase_public: true, showcase_updated_at: "2026-09-09T00:00:00Z", updated_at: "2026-09-09T00:00:00Z" }],
    rpc: { get_owned_act_showcase_editor: saved }
  });
  await expect(page.locator("#owned-showcase-status")).toContainText("アクト紹介を復元しました", { timeout: 15_000 });
  const read = () => page.evaluate(() => [...document.querySelectorAll("#selected-casts [data-selected-index]")].map(r => [
    r.querySelector(".cast-row__name").textContent,
    r.querySelector('[data-field="quote"]').value,
    r.querySelector('[data-field="tagline"]').value,
    r.querySelector('[data-field="description"]').value,
    r.dataset.manual === "true"
  ]));
  expect(await read()).toEqual([
    ["テストキャスト2", "カタナ", "二番目の一言", "二番目の本文", false],
    // The role of a manual cast comes from its primary style (the handout title of an unregistered cast has no participant row).
    ["復元用手動", "カブト", "手動の一言", "手動の本文", true],
    ["テストキャスト1", "カゼ", "一番目の一言", "一番目の本文", false]
  ]);
  await expect(page.locator("#cast-order-count")).toHaveText("3");
});

test("guests are small cards that open into the editor", async ({ page }) => {
  await openGenerator(page);
  await expect(page.locator("#section-cast #showcase-guests .empty-state")).toBeVisible();
  await page.locator("#add-showcase-guest").click();
  const guestCard = page.locator("#showcase-guests .showcase-guest-card");
  await expect(guestCard).toHaveCount(1);
  await expect(guestCard).toHaveAttribute("open", "");
  await guestCard.locator('[data-guest-field="name"]').fill("ゲストの名前");
  await guestCard.locator('[data-guest-field="handle"]').fill("ゲスト異名");
  await expect(guestCard.locator("[data-guest-summary-name]")).toHaveText("ゲストの名前");
  await expect(guestCard.locator("[data-guest-summary-style]")).toContainText("“ゲスト異名”");
  await guestCard.locator("summary").click();
  await expect(guestCard.locator(".showcase-guest-editor")).toBeHidden();
  await page.locator("#add-showcase-guest").click();
  await expect(page.locator("#showcase-guests .showcase-guest-card")).toHaveCount(2);
  // The first card stays closed after the re-render.
  await expect(page.locator("#showcase-guests .showcase-guest-card").nth(0)).not.toHaveAttribute("open", "");
  await expect(page.locator("#showcase-guests .showcase-guest-card").nth(1)).toHaveAttribute("open", "");
  await expect(page.locator("#guest-count")).toHaveText("2");
});

test("no horizontal overflow with six rows open at the narrow and the middle widths", async ({ page }) => {
  const publicCasts = Array.from({ length: 6 }, (_, index) => ({ ...MOCK_PUBLIC_CASTS[0], id: `00000000-0000-4000-8000-0000000002${index}`, public_id: `TNX-OVF00${index}`, character_name: `とても長い名前のキャラクター${index}番目のテスト`, handle: "とても長いハンドルの名前がここに入ります" }));
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await openGenerator(page, { publicCasts });
    for (let index = 0; index < 6; index += 1) await page.locator(`[data-public-character-id="${publicCasts[index].id}"]`).click();
    for (let index = 0; index < 6; index += 1) await row(page, index).locator('[data-action="toggle"]').click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `no horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);
    await page.goto("about:blank");
  }
});

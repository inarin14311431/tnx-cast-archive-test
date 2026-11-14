import { test, expect } from "@playwright/test";
import { installShowcaseGeneratorMock, removedStoragePaths, MOCK_PUBLIC_CASTS, MOCK_USER_ID } from "./fixtures/showcase-generator-mock.mjs";

// The picture of a manual cast (docs/SHOWCASE_GENERATOR_REDESIGN.md section 7): upload, replace, remove and restore, with the Storage calls
// the page makes. Pictures uploaded in this session go at once when they stop being used; a picture a published showcase shows goes
// only after the next publication.

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const png = name => ({ name, mimeType: "image/png", buffer: PNG });
const PUBLIC_BASE = "https://koprmbkoftuuffslhsvt.supabase.co/storage/v1/object/public/character-images";
const OWN_PREFIX = `${MOCK_USER_ID}/act-manual/`;

async function openGenerator(page, options = {}) {
  await page.route("**/*", route => {
    const { hostname } = new URL(route.request().url());
    return hostname === "127.0.0.1" || hostname === "localhost" ? route.fallback() : route.abort();
  });
  const calls = await installShowcaseGeneratorMock(page, {
    ...options,
    rpc: { publish_act_showcase_for_current_user: "act-mock-id", replace_act_showcase_guests_for_current_user: null, ...options.rpc }
  });
  await page.goto(`/showcase-generator.html${options.query || ""}`);
  await expect(page.locator("html")).toHaveAttribute("data-showcase-generator-state", "ready", { timeout: 15_000 });
  await expect(page.locator("#public-cast-grid [data-public-character-id]").first()).toBeVisible();
  return calls;
}

const form = page => page.locator("#manual-cast-form");
const row = (page, index = 0) => page.locator(`#selected-casts [data-selected-index="${index}"]`);

async function openForm(page) {
  await page.locator("#add-manual-cast").click();
  await expect(form(page)).toBeVisible();
}

// A manual row's picture, handle, name and details are in its "編集" panel; a row added from the form opens only its handout panel.
async function openEdit(page, index = 0) {
  await row(page, index).locator('[data-action="toggle"][data-panel="identity"]').click();
}

test("the add form has a drop area, an optional URL, and says that uploaded pictures are public", async ({ page }) => {
  await openGenerator(page);
  await openForm(page);
  await expect(form(page).locator("[data-manual-drop]")).toBeVisible();
  await expect(form(page).locator(".manual-image__hint")).toContainText("画像をドロップ、またはクリックして選ぶ");
  await expect(form(page).locator(".manual-image__hint")).toContainText("1MB以下");
  await expect(form(page).locator('[data-manual-new="imageUrl"]')).toBeVisible();
  await expect(form(page).locator(".manual-image__note")).toContainText("アップロードした画像は公開されます");
  await expect(form(page).locator("#manual-image-clear")).toBeHidden();
  // The form keeps its fields on the right of the picture area.
  const drop = await form(page).locator("[data-manual-drop]").boundingBox();
  const name = await form(page).locator('[data-manual-new="name"]').boundingBox();
  expect(drop.x + drop.width).toBeLessThanOrEqual(name.x);
});

test("a chosen file is uploaded under the user's act-manual folder, fills the URL, and becomes the cast's picture in the row and the export", async ({ page }) => {
  const calls = await openGenerator(page);
  await openForm(page);
  await form(page).locator('[data-manual-image-file="new"]').setInputFiles(png("own.png"));
  await expect(page.locator("#manual-image-status")).toHaveText("画像をアップロードしました。");
  expect(calls.storageUploads).toHaveLength(1);
  expect(calls.storageUploads[0]).toMatch(new RegExp(`^character-images/${OWN_PREFIX}[0-9a-f-]{36}\\.png$`));
  const path = calls.storageUploads[0].replace("character-images/", "");
  const url = `${PUBLIC_BASE}/${path}`;
  await expect(form(page).locator('[data-manual-new="imageUrl"]')).toHaveValue(url);
  await expect(form(page).locator(".manual-image__preview")).toBeVisible();
  await expect(form(page).locator("#manual-image-clear")).toBeVisible();

  await form(page).locator('[data-manual-new="name"]').fill("画像つきの手動キャスト");
  await form(page).locator('button[type="submit"]').click();
  await expect(row(page).locator("img.cast-row__thumb")).toHaveAttribute("src", url);
  await expect(row(page).locator('[data-field="manual-image-url"]')).toHaveValue(url);
  expect(removedStoragePaths(calls)).toEqual([]);

  await row(page).locator('[data-field="quote"]').fill("共通");
  await page.locator("#open-html-export").click();
  await expect(page.locator("#html-export-status")).toContainText("HTMLを生成しました", { timeout: 15_000 });
  await expect(page.frameLocator("#showcase-preview").locator(".cast-card__image img")).toHaveAttribute("src", url);
});

test("a refused file sends nothing and says why", async ({ page }) => {
  const calls = await openGenerator(page);
  await openForm(page);
  await form(page).locator('[data-manual-image-file="new"]').setInputFiles({ name: "x.gif", mimeType: "image/gif", buffer: PNG });
  await expect(page.locator("#manual-image-status")).toHaveText("画像はJPEG / PNG / WebPを使用してください。");
  await form(page).locator('[data-manual-image-file="new"]').setInputFiles({ name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(1024 * 1024 + 1) });
  await expect(page.locator("#manual-image-status")).toHaveText("画像は1MB以下にしてください。");
  expect(calls.storageUploads).toHaveLength(0);
  await expect(form(page).locator('[data-manual-new="imageUrl"]')).toHaveValue("");
});

test("an uploaded picture that is not used goes at once: cancel, typing another URL, 画像を外す", async ({ page }) => {
  const calls = await openGenerator(page);
  await openForm(page);

  await form(page).locator('[data-manual-image-file="new"]').setInputFiles(png("a.png"));
  await expect.poll(() => calls.storageUploads.length).toBe(1);
  const first = calls.storageUploads[0].replace("character-images/", "");
  await form(page).locator("#cancel-manual-cast").click();
  await expect.poll(() => removedStoragePaths(calls)).toEqual([first]);

  await openForm(page);
  await form(page).locator('[data-manual-image-file="new"]').setInputFiles(png("b.png"));
  await expect.poll(() => calls.storageUploads.length).toBe(2);
  const second = calls.storageUploads[1].replace("character-images/", "");
  await form(page).locator('[data-manual-new="imageUrl"]').fill("https://example.invalid/external.png");
  await expect.poll(() => removedStoragePaths(calls)).toEqual([first, second]);
  await expect(form(page).locator("#manual-image-clear")).toBeVisible();

  await form(page).locator('[data-manual-image-file="new"]').setInputFiles(png("c.png"));
  await expect.poll(() => calls.storageUploads.length).toBe(3);
  const third = calls.storageUploads[2].replace("character-images/", "");
  await form(page).locator("#manual-image-clear").click();
  await expect.poll(() => removedStoragePaths(calls)).toEqual([first, second, third]);
  await expect(form(page).locator('[data-manual-new="imageUrl"]')).toHaveValue("");
  await expect(form(page).locator("#manual-image-clear")).toBeHidden();
});

test("a row's picture can be replaced, removed with the button, or go with the cast, and each removes the uploaded file", async ({ page }) => {
  const calls = await openGenerator(page);
  await openForm(page);
  await form(page).locator('[data-manual-new="name"]').fill("入れ替えるキャスト");
  await form(page).locator('[data-manual-image-file="new"]').setInputFiles(png("one.png"));
  await expect.poll(() => calls.storageUploads.length).toBe(1);
  const one = calls.storageUploads[0].replace("character-images/", "");
  await form(page).locator('button[type="submit"]').click();
  await openEdit(page);
  await expect(row(page).locator(".manual-image__preview")).toBeVisible();

  // replace: the new file is uploaded, the old one removed
  await row(page).locator('[data-manual-image-file="row"]').setInputFiles(png("two.png"));
  await expect.poll(() => calls.storageUploads.length).toBe(2);
  const two = calls.storageUploads[1].replace("character-images/", "");
  await expect.poll(() => removedStoragePaths(calls)).toEqual([one]);
  await expect(row(page).locator("img.cast-row__thumb")).toHaveAttribute("src", `${PUBLIC_BASE}/${two}`);

  // the button puts the placeholder back and removes the file
  await row(page).locator('[data-action="manual-image-clear"]').click();
  await expect.poll(() => removedStoragePaths(calls)).toEqual([one, two]);
  await expect(row(page).locator('[data-field="manual-image-url"]')).toHaveValue("");
  await expect(row(page).locator("img.cast-row__thumb")).toHaveAttribute("src", /scan-failed/);
  await expect(row(page).locator('[data-action="manual-image-clear"]')).toBeHidden();

  // removing the cast removes its file
  await row(page).locator('[data-manual-image-file="row"]').setInputFiles(png("three.png"));
  await expect.poll(() => calls.storageUploads.length).toBe(3);
  const three = calls.storageUploads[2].replace("character-images/", "");
  await row(page).locator('[data-action="remove"]').click();
  await expect.poll(() => removedStoragePaths(calls)).toEqual([one, two, three]);
});

test("an external URL is never touched in Storage", async ({ page }) => {
  const calls = await openGenerator(page);
  await openForm(page);
  await form(page).locator('[data-manual-new="name"]').fill("外部画像のキャスト");
  await form(page).locator('[data-manual-new="imageUrl"]').fill("https://example.invalid/own.webp");
  await form(page).locator('button[type="submit"]').click();
  await expect(row(page).locator("img.cast-row__thumb")).toHaveAttribute("src", "https://example.invalid/own.webp");
  await openEdit(page);
  await row(page).locator('[data-action="manual-image-clear"]').click();
  await row(page).locator('[data-action="remove"]').click();
  expect(calls.storageUploads).toHaveLength(0);
  expect(removedStoragePaths(calls)).toEqual([]);
});

test("a restored picture is shown, and the file it was published with goes only after the next publication replaced it", async ({ page }) => {
  const [first] = MOCK_PUBLIC_CASTS;
  const { obfuscatePublicId } = await import("../../js/showcase-restore-matching.js");
  const oldPath = `${OWN_PREFIX}published-old.png`;
  const oldUrl = `${PUBLIC_BASE}/${oldPath}`;
  const guestUrl = `${PUBLIC_BASE}/${MOCK_USER_ID}/act-guests/guest.png`;
  const saved = {
    slug: "manual-image-restore", actName: "画像の復元", rulerName: "",
    showcaseData: {
      version: 2, pageTitle: "ACT CAST FILE", actName: "画像の復元", rulerName: "",
      casts: [
        { serial: obfuscatePublicId(first.public_id), fullName: "ハンドル1 テストキャスト1", styles: [{ label: "カタナ◎", handoutRole: true }], meta: [], tagline: "", handout: { title: "『カタナ』用ハンドアウト", body: "本文" } },
        { serial: "PRIVATE", imageUrl: oldUrl, fullName: "画像つき手動", styles: [{ label: "カブト◎", handoutRole: true }], meta: [], tagline: "", handout: { title: "共通ハンドアウト", body: "本文" } },
        { serial: "PRIVATE", imageUrl: guestUrl, fullName: "他の種類の画像", styles: [{ label: "カブト◎", handoutRole: true }], meta: [], tagline: "", handout: { title: "共通ハンドアウト", body: "本文" } }
      ]
    },
    participants: [{ characterId: first.id, characterPublicId: first.public_id, castOrder: 1, participationRole: "カタナ" }]
  };
  const calls = await openGenerator(page, {
    query: `?edit=${saved.slug}`,
    ownedActs: [{ slug: saved.slug, act_name: saved.actName, ruler_name: "", showcase_public: true, showcase_updated_at: "2026-09-09T00:00:00Z", updated_at: "2026-09-09T00:00:00Z" }],
    rpc: { get_owned_act_showcase_editor: saved }
  });
  await expect(page.locator("#owned-showcase-status")).toContainText("アクト紹介を復元しました", { timeout: 15_000 });
  await expect(row(page, 1).locator('[data-field="manual-image-url"]')).toHaveValue(oldUrl);
  await expect(row(page, 1).locator("img.cast-row__thumb")).toHaveAttribute("src", oldUrl);
  await expect(row(page, 2).locator('[data-field="manual-image-url"]')).toHaveValue(guestUrl);

  // replacing the restored picture does not remove the published file yet
  await row(page, 1).locator('[data-manual-image-file="row"]').setInputFiles(png("new.png"));
  await expect.poll(() => calls.storageUploads.length).toBe(1);
  const newPath = calls.storageUploads[0].replace("character-images/", "");
  expect(removedStoragePaths(calls)).toEqual([]);
  // a picture of another kind (a guest's) is never removed by this page
  await row(page, 2).locator('[data-action="remove"]').click();
  expect(removedStoragePaths(calls)).toEqual([]);

  await page.locator("#publish-cinematic-button").click();
  await expect.poll(() => calls.rpcCalls.filter(call => call.name === "publish_act_showcase_for_current_user").length, { timeout: 20_000 }).toBe(1);
  const published = calls.rpcCalls.find(call => call.name === "publish_act_showcase_for_current_user").body.p_showcase_data;
  expect(published.casts.map(cast => cast.imageUrl)).toContain(`${PUBLIC_BASE}/${newPath}`);
  // after the publication has replaced the showcase, the old file goes, and only that one
  await expect.poll(() => removedStoragePaths(calls)).toEqual([oldPath]);
});

test("the picture of a manual cast is published with the showcase and comes back on restore", async ({ page }) => {
  const [first] = MOCK_PUBLIC_CASTS;
  const calls = await openGenerator(page);
  await page.locator(`[data-public-character-id="${first.id}"]`).click();
  await row(page, 0).locator('[data-action="toggle"]').click();
  await row(page, 0).locator('[data-field="quote"]').selectOption("共通");
  await openForm(page);
  await form(page).locator('[data-manual-new="name"]').fill("公開する手動キャスト");
  await form(page).locator('[data-manual-image-file="new"]').setInputFiles(png("pub.png"));
  await expect.poll(() => calls.storageUploads.length).toBe(1);
  const path = calls.storageUploads[0].replace("character-images/", "");
  await form(page).locator('button[type="submit"]').click();
  await row(page, 1).locator('[data-field="quote"]').fill("共通");
  await page.locator("#publish-standard-button").click();
  await expect.poll(() => calls.rpcCalls.filter(call => call.name === "publish_act_showcase_for_current_user").length, { timeout: 20_000 }).toBe(1);
  const published = calls.rpcCalls.find(call => call.name === "publish_act_showcase_for_current_user").body.p_showcase_data;
  const manual = published.casts.find(cast => cast.fullName === "公開する手動キャスト");
  expect(manual.imageUrl).toBe(`${PUBLIC_BASE}/${path}`);
  // published from here: the file is now part of the published showcase, so removing the cast afterwards keeps it until the next publication
  await row(page, 1).locator('[data-action="remove"]').click();
  expect(removedStoragePaths(calls)).toEqual([]);
});

test("no horizontal overflow with the picture block open at the middle and narrow widths", async ({ page }) => {
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await openGenerator(page);
    await openForm(page);
    await form(page).locator('[data-manual-new="name"]').fill("あふれの確認");
    await form(page).locator('[data-manual-image-file="new"]').setInputFiles(png("o.png"));
    await expect(page.locator("#manual-image-status")).toHaveText("画像をアップロードしました。");
    await form(page).locator('button[type="submit"]').click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `no horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);
    await page.goto("about:blank");
  }
});

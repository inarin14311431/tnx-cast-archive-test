import { test, expect } from "@playwright/test";
import { installShowcaseGeneratorMock, removedStoragePaths, MOCK_PUBLIC_CASTS, MOCK_USER_ID } from "./fixtures/showcase-generator-mock.mjs";
import { obfuscatePublicId } from "../../js/showcase-restore-matching.js";

// "公開中のアクト紹介からコピー" (js/showcase-copy-from-public.js): someone else's published showcase becomes a new draft of one's own.
// The source is only read through the public RPCs; its pictures are uploaded again under the copier's folder; the draft gets a new
// slug and a publication to the source's slug is stopped before anything is written.

const PUBLIC_BASE = "https://koprmbkoftuuffslhsvt.supabase.co/storage/v1/object/public/character-images";
const AUTHOR = "22222222-2222-4222-8222-222222222222";
const SOURCE_SLUG = "act-0007";
const SOURCE_URL = `https://example.test/tnx/act-showcase.html?id=${SOURCE_SLUG}`;
const [first] = MOCK_PUBLIC_CASTS;

const SOURCE = {
  version: 2, pageTitle: "ACT CAST FILE", heroSubTitle: "ネオンの残像", actName: "NEON AFTERIMAGE", rulerName: "稲荷秋",
  scenarioWriterName: "芳賀琉", theme: "intron", trailer: { title: "アクトトレーラー", body: "トレーラー本文" },
  casts: [
    { serial: obfuscatePublicId(first.public_id), slot: "CAST 01", fullName: "“ハンドル1” テストキャスト1", styles: [{ label: "カタナ◎", handoutRole: true }], meta: [], tagline: "“一言その1”", handout: { title: "『カタナ』用ハンドアウト", body: "ハンドアウト1" } },
    { serial: "ScanFailed", slot: "CAST 02", imageUrl: `${PUBLIC_BASE}/${AUTHOR}/act-manual/source.png`, fullName: "“Instant Fire” 大文字 炎十朗", styles: [{ label: "カブト◎", handoutRole: true }], meta: [{ label: "PLAYER", value: "作者の友人" }], tagline: "", handout: { title: "共通ハンドアウト", body: "ハンドアウト2" } },
    { serial: obfuscatePublicId("TNX-GONE01"), slot: "CAST 03", fullName: "“消えた” キャスト", styles: [], meta: [], tagline: "", handout: null }
  ]
};
const GUESTS = [{ sort_order: 1, handle: "地球王", name: "ゲストA", persona_style: "カブト", affiliation: "", gender: "", age: "", tagline: "", summary: "概要", image_url: `${PUBLIC_BASE}/${AUTHOR}/act-guests/guest.png` }];

async function openGenerator(page, options = {}) {
  await page.route("**/*", route => {
    const { hostname } = new URL(route.request().url());
    return hostname === "127.0.0.1" || hostname === "localhost" ? route.fallback() : route.abort();
  });
  const calls = await installShowcaseGeneratorMock(page, {
    ownedActs: [{ slug: "act-0003", act_name: "自分のアクト", ruler_name: "", showcase_public: true, showcase_updated_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z" }],
    ...options,
    rpc: {
      get_public_act_showcase: body => (body?.p_slug === SOURCE_SLUG ? SOURCE : null),
      get_public_act_showcase_guests: body => (body?.p_slug === SOURCE_SLUG ? GUESTS : []),
      publish_act_showcase_for_current_user: "act-mock-id",
      replace_act_showcase_guests_for_current_user: null,
      ...options.rpc
    }
  });
  await page.goto("/showcase-generator.html");
  await expect(page.locator("html")).toHaveAttribute("data-showcase-generator-state", "ready", { timeout: 15_000 });
  await expect(page.locator("#public-cast-grid [data-public-character-id]").first()).toBeVisible();
  await page.locator("#owned-showcase-toggle").click();
  await expect(page.locator("#load-copy-showcase")).toBeEnabled();
  return calls;
}

const row = (page, index) => page.locator(`#selected-casts [data-selected-index="${index}"]`);
const writes = calls => calls.rpcCalls.filter(call => !call.name.startsWith("get_"));

async function copySource(page) {
  await page.locator("#copy-showcase-source").fill(SOURCE_URL);
  await page.locator("#load-copy-showcase").click();
  await expect(page.locator("#copy-showcase-status")).toContainText("「NEON AFTERIMAGE」をコピーしました", { timeout: 15_000 });
}

test("a public showcase is copied into a new draft: registered casts referred to, manual casts and guests copied with their pictures", async ({ page }) => {
  const calls = await openGenerator(page);
  await copySource(page);

  // a new slug past the source's, and the act's own fields
  await expect(page.locator("#publish-slug")).toHaveValue("act-0008");
  await expect(page.locator("#act-name")).toHaveValue("NEON AFTERIMAGE");
  await expect(page.locator("#act-subtitle")).toHaveValue("ネオンの残像");
  await expect(page.locator("#ruler-name")).toHaveValue("稲荷秋");
  await expect(page.locator("#scenario-writer-name")).toHaveValue("芳賀琉");
  await expect(page.locator("#showcase-theme")).toHaveValue("intron");
  await expect(page.locator("#intro-text")).toHaveValue("トレーラー本文");

  // the registered cast is selected (not copied); the manual one is copied; the unreachable one is named and left out
  await expect(page.locator("#selected-casts [data-selected-index]")).toHaveCount(2);
  await expect(row(page, 0)).toHaveAttribute("data-character-id", first.id);
  await expect(row(page, 1).locator('[data-field="manual-handle"]')).toHaveValue("Instant Fire");
  await expect(row(page, 1).locator('[data-field="manual-name"]')).toHaveValue("大文字 炎十朗");
  await expect(page.locator("#copy-showcase-status")).toContainText("“消えた” キャスト");

  // the pictures are now the copier's own files
  const manualUrl = await row(page, 1).locator('[data-field="manual-image-url"]').inputValue();
  expect(manualUrl.startsWith(`${PUBLIC_BASE}/${MOCK_USER_ID}/act-manual/`)).toBe(true);
  expect(calls.storageUploads.map(path => path.replace(/[^/]+$/, ""))).toEqual([
    `character-images/${MOCK_USER_ID}/act-manual/`,
    `character-images/${MOCK_USER_ID}/act-guests/`
  ]);
  await expect(page.locator("#guest-count")).toHaveText("1");

  // nothing was written or removed so far, and the publish buttons are for a new act
  expect(writes(calls)).toEqual([]);
  expect(removedStoragePaths(calls)).toEqual([]);
  await expect(page.locator("#publish-cinematic-button")).not.toHaveAttribute("data-republish", "true");

  await page.locator("#publish-cinematic-button").click();
  await expect.poll(() => calls.rpcCalls.filter(call => call.name === "publish_act_showcase_for_current_user").length, { timeout: 20_000 }).toBe(1);
  const published = calls.rpcCalls.find(call => call.name === "publish_act_showcase_for_current_user").body;
  expect(published.p_slug).toBe("act-0008");
  expect(published.p_showcase_data.casts.map(cast => cast.imageUrl)).toContain(manualUrl);
  const savedGuests = calls.rpcCalls.find(call => call.name === "replace_act_showcase_guests_for_current_user").body;
  expect(savedGuests.p_slug).toBe("act-0008");
  expect(savedGuests.p_guests[0].imageUrl.startsWith(`${PUBLIC_BASE}/${MOCK_USER_ID}/act-guests/`)).toBe(true);
  // the source's slug was never written to, and none of its files was removed
  expect(writes(calls).filter(call => JSON.stringify(call.body).includes(SOURCE_SLUG))).toEqual([]);
  expect(removedStoragePaths(calls).filter(path => path.startsWith(AUTHOR))).toEqual([]);
});

test("publishing a copy to the source's slug is stopped before anything is written", async ({ page }) => {
  const calls = await openGenerator(page);
  await copySource(page);
  await page.locator("#section-act .showcase-advanced > summary").click();
  await page.locator("#publish-slug").fill(SOURCE_SLUG);
  await page.locator("#publish-cinematic-button").click();
  await expect(page.locator("#copy-showcase-status")).toContainText("コピー元と同じアクト識別名");
  await page.locator("#history-button").click();
  await page.waitForTimeout(500);
  expect(writes(calls)).toEqual([]);
});

test("a draft in progress is replaced only after a confirmation", async ({ page }) => {
  const calls = await openGenerator(page);
  await page.locator("#act-name").fill("書きかけのアクト");
  page.once("dialog", dialog => dialog.dismiss());
  await page.locator("#copy-showcase-source").fill(SOURCE_SLUG);
  await page.locator("#load-copy-showcase").click();
  await expect(page.locator("#copy-showcase-status")).toContainText("コピーを取りやめました");
  await expect(page.locator("#act-name")).toHaveValue("書きかけのアクト");
  expect(calls.storageUploads).toEqual([]);

  page.once("dialog", dialog => dialog.accept());
  await page.locator("#load-copy-showcase").click();
  await expect(page.locator("#copy-showcase-status")).toContainText("をコピーしました", { timeout: 15_000 });
  await expect(page.locator("#act-name")).toHaveValue("NEON AFTERIMAGE");
});

test("a showcase that is not public is reported and changes nothing", async ({ page }) => {
  const calls = await openGenerator(page);
  await page.locator("#copy-showcase-source").fill("act-9999");
  await page.locator("#load-copy-showcase").click();
  await expect(page.locator("#copy-showcase-status")).toContainText("公開中のアクト紹介が見つかりませんでした");
  await expect(page.locator("#selected-casts [data-selected-index]")).toHaveCount(0);
  expect(writes(calls)).toEqual([]);
});

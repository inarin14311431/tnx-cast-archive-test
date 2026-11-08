import { test, expect } from "@playwright/test";
import { installShowcaseGeneratorMock, MOCK_PUBLIC_CASTS, MOCK_PRIVATE_CASTS } from "./fixtures/showcase-generator-mock.mjs";

// The generator with the real modules and a fake Supabase (tests/e2e/fixtures/showcase-generator-mock.mjs).
// docs/SHOWCASE_GENERATOR_REDESIGN.md section 6-1: a publish click generates the HTML itself.

// A row's handout panel (role, tagline, handout text) is closed until its "ハンドアウト" button is pressed.
async function openRow(page, index) {
  const panel = page.locator(`#selected-casts [data-selected-index="${index}"] .cast-row__panel`);
  if (await panel.isHidden()) await page.locator(`#selected-casts [data-selected-index="${index}"] [data-action="toggle"]`).click();
}

async function openGenerator(page, options = {}) {
  await page.route("**/*", route => {
    const { hostname } = new URL(route.request().url());
    return hostname === "127.0.0.1" || hostname === "localhost" ? route.fallback() : route.abort();
  });
  const calls = await installShowcaseGeneratorMock(page, {
    rpc: {
      publish_act_showcase_for_current_user: "act-mock-id",
      replace_act_showcase_guests_for_current_user: null,
      ...options.rpc
    },
    ...options
  });
  await page.goto("/showcase-generator.html");
  await expect(page.locator("html")).toHaveAttribute("data-showcase-generator-state", "ready", { timeout: 15_000 });
  await expect(page.locator("#public-cast-grid [data-public-character-id]").first()).toBeVisible();
  return calls;
}

async function pickPublicCast(page, index) {
  await page.locator(`[data-public-character-id="${MOCK_PUBLIC_CASTS[index].id}"]`).click();
}

// The identifier is under "詳細設定"; the HTML is generated from the export dialog.
async function setSlug(page, value) {
  await page.locator("#section-act .showcase-advanced > summary").click();
  await page.locator("#publish-slug").fill(value);
}

async function generateInDialog(page) {
  await page.locator("#open-html-export").click();
  await expect(page.locator("#html-export-status")).toContainText("HTMLを生成しました", { timeout: 15_000 });
  await page.locator("#close-html-export").click();
}

function rpcCalls(calls, name) {
  return calls.rpcCalls.filter(call => call.name === name);
}

test("a publish click generates the HTML first, saves the guests, then publishes", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const calls = await openGenerator(page);
  await page.locator("#act-name").fill("公開の流れテスト");
  await setSlug(page, "flow-test");
  await pickPublicCast(page, 0);
  await openRow(page, 0);
  await page.locator('[data-selected-index="0"] [data-field="quote"]').selectOption("カタナ");
  await expect(page.locator("#showcase-preview")).not.toHaveAttribute("srcdoc", /./);

  await expect(page.locator("#publish-cinematic-button")).toBeEnabled();
  await page.locator("#publish-cinematic-button").click();
  await expect.poll(() => rpcCalls(calls, "publish_act_showcase_for_current_user").length, { timeout: 20_000 }).toBe(1);

  const names = calls.rpcCalls.map(call => call.name);
  expect(names.indexOf("replace_act_showcase_guests_for_current_user")).toBeGreaterThanOrEqual(0);
  expect(names.indexOf("replace_act_showcase_guests_for_current_user")).toBeLessThan(names.indexOf("publish_act_showcase_for_current_user"));

  const published = rpcCalls(calls, "publish_act_showcase_for_current_user")[0].body;
  expect(published.p_slug).toBe("flow-test");
  expect(published.p_act_name).toBe("公開の流れテスト");
  expect(published.p_participant_ids).toEqual([MOCK_PUBLIC_CASTS[0].id]);
  expect(published.p_showcase_data.casts).toHaveLength(1);
  expect(published.p_showcase_data.casts[0].fullName).toContain("テストキャスト1");
  // The page title was left blank, so the act title is used.
  expect(published.p_showcase_data.pageTitle).toBe("公開の流れテスト");
  expect(published.p_showcase_data.heroTitle).toBe("公開の流れテスト");
  await expect(page.locator("#generator-status")).toContainText("公開処理が完了しました");
  expect(errors).toEqual([]);
});

test("the standard publication button takes the same path", async ({ page }) => {
  const calls = await openGenerator(page);
  await setSlug(page, "flow-standard");
  await pickPublicCast(page, 1);
  await openRow(page, 0);
  await page.locator('[data-selected-index="0"] [data-field="quote"]').selectOption("共通");
  await page.locator("#publish-standard-button").click();
  await expect.poll(() => rpcCalls(calls, "publish_act_showcase_for_current_user").length, { timeout: 20_000 }).toBe(1);
  await expect(page.locator("#generator-status")).toContainText("従来版の公開処理が完了しました");
});

test("an edit after a generation is published, not the old HTML", async ({ page }) => {
  const calls = await openGenerator(page);
  await page.locator("#act-name").fill("最初のタイトル");
  await setSlug(page, "flow-edit");
  await pickPublicCast(page, 0);
  await openRow(page, 0);
  await page.locator('[data-selected-index="0"] [data-field="quote"]').selectOption("カタナ");
  await generateInDialog(page);
  await expect(page.locator("#showcase-preview")).toHaveAttribute("srcdoc", /最初のタイトル/);

  await page.locator("#act-name").fill("変更後のタイトル");
  await expect(page.locator("#showcase-preview")).not.toHaveAttribute("srcdoc", /./);
  await page.locator("#publish-cinematic-button").click();
  await expect.poll(() => rpcCalls(calls, "publish_act_showcase_for_current_user").length, { timeout: 20_000 }).toBe(1);
  const published = rpcCalls(calls, "publish_act_showcase_for_current_user")[0].body;
  expect(published.p_act_name).toBe("変更後のタイトル");
  expect(published.p_showcase_data.actName).toBe("変更後のタイトル");
});

test("an existing generation is reused when nothing changed", async ({ page }) => {
  const calls = await openGenerator(page);
  await setSlug(page, "flow-reuse");
  await pickPublicCast(page, 0);
  await openRow(page, 0);
  await page.locator('[data-selected-index="0"] [data-field="quote"]').selectOption("カタナ");
  await generateInDialog(page);
  await expect(page.locator("#showcase-preview")).toHaveAttribute("srcdoc", /./);
  await page.locator("#publish-standard-button").click();
  await expect.poll(() => rpcCalls(calls, "publish_act_showcase_for_current_user").length, { timeout: 20_000 }).toBe(1);
});

test("a failed generation shows its reason and publishes nothing", async ({ page }) => {
  const calls = await openGenerator(page);
  await setSlug(page, "flow-invalid");
  await pickPublicCast(page, 0);
  // No role (参加枠) chosen: the generator rejects it.
  await page.locator("#publish-cinematic-button").click();
  await expect(page.locator("#generator-status")).toContainText("参加枠");
  await expect(page.locator("#generator-status")).toHaveClass(/is-error/);
  await expect(page.locator("#publish-cinematic-button")).toBeEnabled();
  expect(rpcCalls(calls, "publish_act_showcase_for_current_user")).toHaveLength(0);

  await page.locator("#selected-casts [data-action='remove']").click();
  await page.locator("#publish-cinematic-button").click();
  await expect(page.locator("#generator-status")).toContainText("キャストを1名以上");
  expect(rpcCalls(calls, "publish_act_showcase_for_current_user")).toHaveLength(0);
});

test("a private cast blocks publishing and leaves the HTML export", async ({ page }) => {
  const calls = await openGenerator(page);
  await setSlug(page, "flow-private");
  await pickPublicCast(page, 0);
  await page.locator(`[data-private-character-id="${MOCK_PRIVATE_CASTS[0].id}"]`).click();
  await expect(page.locator("#publish-cinematic-button")).toBeDisabled();
  await expect(page.locator("#publish-standard-button")).toBeDisabled();
  await expect(page.locator("#publish-cinematic-button")).toHaveAttribute("title", /非公開キャスト/);

  for (const index of [0, 1]) {
    await page.locator(`[data-selected-index="${index}"] [data-field="quote"]`).selectOption("共通");
  }
  await page.locator("#open-html-export").click();
  await expect(page.locator("#download-button")).toBeEnabled({ timeout: 15_000 });
  await page.locator("#close-html-export").click();
  expect(rpcCalls(calls, "publish_act_showcase_for_current_user")).toHaveLength(0);

  await page.locator('[data-selected-index="1"] [data-action="remove"]').click();
  await expect(page.locator("#publish-cinematic-button")).toBeEnabled();
  await expect(page.locator("#publish-cinematic-button")).toHaveAttribute("title", "");
});

test("the HTML export works as before without publishing", async ({ page }) => {
  const calls = await openGenerator(page);
  await pickPublicCast(page, 0);
  await openRow(page, 0);
  await page.locator('[data-selected-index="0"] [data-field="quote"]').selectOption("共通");
  await expect(page.locator("#download-button")).toBeDisabled();
  await page.locator("#open-html-export").click();
  await expect(page.locator("#download-button")).toBeEnabled({ timeout: 15_000 });
  await expect(page.locator("#copy-button")).toBeEnabled();
  expect(calls.rpcCalls.filter(call => call.name.startsWith("publish"))).toHaveLength(0);
});

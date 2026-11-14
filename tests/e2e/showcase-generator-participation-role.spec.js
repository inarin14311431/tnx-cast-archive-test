import { test, expect } from "@playwright/test";
import { installShowcaseGeneratorMock, MOCK_PUBLIC_CASTS, MOCK_PRIVATE_CASTS } from "./fixtures/showcase-generator-mock.mjs";

// 参加枠 (act_participants.participation_role) is saved by the generator itself, in the same owner-scoped call that stores CAST No
// (set_act_participant_cast_orders_for_current_user), right after publishing and right after recording history only. It used to be saved by a
// wrapper around supabase.rpc / supabase.functions.invoke that never covered publish_act_showcase_for_current_user.
// The generator runs with its real modules and a fake Supabase (tests/e2e/fixtures/showcase-generator-mock.mjs).

const SYNC = "set_act_participant_cast_orders_for_current_user";

async function openGenerator(page, options = {}) {
  await page.route("**/*", route => {
    const { hostname } = new URL(route.request().url());
    return hostname === "127.0.0.1" || hostname === "localhost" ? route.fallback() : route.abort();
  });
  const calls = await installShowcaseGeneratorMock(page, {
    ...options,
    rpc: {
      publish_act_showcase_for_current_user: "act-mock-id",
      replace_act_showcase_guests_for_current_user: null,
      record_act_history_for_current_user: "act-mock-id",
      [SYNC]: 1,
      ...options.rpc
    }
  });
  await page.goto("/showcase-generator.html");
  await expect(page.locator("html")).toHaveAttribute("data-showcase-generator-state", "ready", { timeout: 15_000 });
  await expect(page.locator("#public-cast-grid [data-public-character-id]").first()).toBeVisible();
  return calls;
}

const rpcCalls = (calls, name) => calls.rpcCalls.filter(call => call.name === name);
const row = (page, index) => page.locator(`#selected-casts [data-selected-index="${index}"]`);

async function setSlug(page, value) {
  await page.locator("#section-act .showcase-advanced > summary").click();
  await page.locator("#publish-slug").fill(value);
}

// A row's handout panel (CAST No, 参加枠, tagline, handout text) is closed until its "ハンドアウト" button is pressed.
async function openHandout(page, index) {
  if (await row(page, index).locator(".cast-row__panel--handout").isHidden()) await row(page, index).locator('[data-action="toggle"][data-panel="handout"]').click();
}

async function pickPublic(page, index, role, castNo = "") {
  await page.locator(`[data-public-character-id="${MOCK_PUBLIC_CASTS[index].id}"]`).click();
  const at = (await page.locator("#selected-casts .cast-row").count()) - 1;
  await openHandout(page, at);
  await row(page, at).locator('[data-field="quote"]').selectOption(role);
  if (castNo) await row(page, at).locator('[data-field="cast-no"]').fill(castNo);
}

async function addManual(page, name, role) {
  await page.locator("#add-manual-cast").click();
  await page.locator('#manual-cast-form [data-manual-new="name"]').fill(name);
  await page.locator('#manual-cast-form button[type="submit"]').click();
  const at = (await page.locator("#selected-casts .cast-row").count()) - 1;
  await openHandout(page, at);
  await row(page, at).locator('[data-field="quote"]').fill(role);
}

test("a publish saves each registered cast's CAST No and 参加枠 right after the publish RPC; a manual cast is left out", async ({ page }) => {
  const calls = await openGenerator(page);
  await page.locator("#act-name").fill("参加枠の保存");
  await setSlug(page, "role-publish");
  await pickPublic(page, 0, "カタナ");
  await addManual(page, "手動キャスト", "共通");
  await pickPublic(page, 1, "共通", "5");
  await page.locator("#publish-cinematic-button").click();
  await expect.poll(() => rpcCalls(calls, SYNC).length, { timeout: 20_000 }).toBe(1);

  const names = calls.rpcCalls.map(call => call.name);
  expect(names.indexOf(SYNC)).toBeGreaterThan(names.indexOf("publish_act_showcase_for_current_user"));
  const body = rpcCalls(calls, SYNC)[0].body;
  expect(body.p_slug).toBe("role-publish");
  // the registered casts, in the order of the list (the manual cast is row 1 and has no character id), with the CAST No the row shows
  expect(body.p_orders).toEqual([
    { characterId: MOCK_PUBLIC_CASTS[0].id, castOrder: 1, participationRole: "カタナ" },
    { characterId: MOCK_PUBLIC_CASTS[1].id, castOrder: 5, participationRole: "共通" }
  ]);
  expect(JSON.stringify(body)).not.toContain("手動キャスト");
  // a successful save is said in the result card
  await expect(page.locator("#publish-result")).toContainText("参加アクト履歴にも反映しました");
});

test("a role changed after the first publish is saved by the next one", async ({ page }) => {
  const calls = await openGenerator(page);
  await page.locator("#act-name").fill("再公開");
  await setSlug(page, "role-republish");
  await pickPublic(page, 0, "カタナ");
  await page.locator("#publish-cinematic-button").click();
  await expect.poll(() => rpcCalls(calls, SYNC).length, { timeout: 20_000 }).toBe(1);
  await openHandout(page, 0);
  await row(page, 0).locator('[data-field="quote"]').selectOption("共通");
  await page.locator("#publish-cinematic-button").click();
  await expect.poll(() => rpcCalls(calls, SYNC).length, { timeout: 20_000 }).toBe(2);
  expect(rpcCalls(calls, SYNC)[1].body.p_orders).toEqual([{ characterId: MOCK_PUBLIC_CASTS[0].id, castOrder: 1, participationRole: "共通" }]);
});

test("history only saves CAST No and 参加枠 of the registered casts (public and private), after recording the history", async ({ page }) => {
  const calls = await openGenerator(page);
  await page.locator("#act-name").fill("履歴だけ");
  await setSlug(page, "role-history");
  await pickPublic(page, 0, "カタナ");
  await page.locator("#cast-source-private").click();
  await page.locator(`[data-private-character-id="${MOCK_PRIVATE_CASTS[0].id}"]`).click();
  await openHandout(page, 1);
  await row(page, 1).locator('[data-field="quote"]').selectOption("共通");
  await addManual(page, "手動キャスト", "トーキー");
  await page.locator("#history-button").click();
  await expect.poll(() => rpcCalls(calls, SYNC).length, { timeout: 20_000 }).toBe(1);

  const names = calls.rpcCalls.map(call => call.name);
  expect(names.indexOf(SYNC)).toBeGreaterThan(names.indexOf("record_act_history_for_current_user"));
  const body = rpcCalls(calls, SYNC)[0].body;
  expect(body.p_slug).toBe("role-history");
  expect(body.p_orders).toEqual([
    { characterId: MOCK_PUBLIC_CASTS[0].id, castOrder: 1, participationRole: "カタナ" },
    { characterId: MOCK_PRIVATE_CASTS[0].id, castOrder: 2, participationRole: "共通" }
  ]);
  await expect(page.locator("#generator-status")).toContainText("参加アクト履歴へ登録しました");
  await expect(page.locator("#generator-status")).not.toContainText("更新できませんでした");
});

test("if saving CAST No and 参加枠 fails, the publish still succeeds and the card says so", async ({ page }) => {
  const calls = await openGenerator(page, { rpcFailures: { [SYNC]: "function does not exist" } });
  await page.locator("#act-name").fill("保存失敗");
  await setSlug(page, "role-fail");
  await pickPublic(page, 0, "カタナ");
  await page.locator("#publish-cinematic-button").click();
  await expect.poll(() => rpcCalls(calls, SYNC).length, { timeout: 20_000 }).toBe(1);
  await expect(page.locator("#publish-result")).toBeVisible();
  await expect(page.locator("#publish-result")).toContainText("公開しました");
  await expect(page.locator("#publish-result")).toContainText("CAST No.と参加枠は更新できませんでした");
});

test("if saving fails after a history-only registration, the history is still registered and the status says so", async ({ page }) => {
  const calls = await openGenerator(page, { rpcFailures: { [SYNC]: "function does not exist" } });
  await page.locator("#act-name").fill("履歴の保存失敗");
  await setSlug(page, "role-history-fail");
  await pickPublic(page, 0, "カタナ");
  await page.locator("#history-button").click();
  await expect.poll(() => rpcCalls(calls, SYNC).length, { timeout: 20_000 }).toBe(1);
  await expect(page.locator("#generator-status")).toContainText("参加アクト履歴へ登録しました");
  await expect(page.locator("#generator-status")).toContainText("CAST No.と参加枠は更新できませんでした");
  await expect(page.locator("#generator-status")).toHaveClass(/is-success/);
});

test("nothing wraps supabase.rpc or supabase.functions any more: the generator page loads no history-role module", async ({ page }) => {
  const loaded = [];
  page.on("request", request => { if (/showcase-history-role/.test(request.url())) loaded.push(request.url()); });
  await openGenerator(page);
  await page.waitForTimeout(500);
  expect(loaded).toEqual([]);
  expect(await page.evaluate(async () => {
    const { supabase } = await import("/js/supabase-client.js");
    return [supabase.__historyRoleRpcWrapped, supabase.functions?.__historyRoleInvokeWrapped];
  })).toEqual([undefined, undefined]);
});

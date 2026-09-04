import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name === "mobile", "キャラシ倉庫URL取込はdesktopで検証");
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
}

async function openEditor(page) {
  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);
}

async function findImportSources(page) {
  return page.evaluate(async () => {
    const { supabase } = await import("/js/supabase-client.js");
    const { data, error } = await supabase
      .from("characters")
      .select("id,character_name,character_sheet_url")
      .not("character_sheet_url", "is", null)
      .neq("character_sheet_url", "")
      .limit(10);
    if (error) throw new Error(error.message);
    return (data || [])
      .filter(row => String(row.character_sheet_url || "").includes("character-sheets.appspot.com/tnx/"))
      .slice(0, 3);
  });
}

async function importUrl(page, source) {
  await page.locator("#legacy-import-open").click();
  await expect(page.locator("#legacy-import-dialog")).toBeVisible();
  await page.locator("#character-sheets-import-url").fill(source.character_sheet_url);
  await page.locator("#character-sheets-import-run").click();
  await expect(page.locator("#legacy-import-message")).toContainText("取込みが完了しました", { timeout: 210000 });
}

function structuredDefenseInputs(page) {
  return page.locator(
    '#outfit-list [data-ofc="defense_s"], #outfit-list [data-ofc="defense_p"], #outfit-list [data-ofc="defense_i"]'
  );
}

test("登録済みキャラシ倉庫URLを実取得し、旧防御列なしで構造化防御値へ取込できる", async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openEditor(page);

  const sources = await findImportSources(page);
  expect(sources.length, "認証ユーザーから参照できるURL登録済みキャストが必要").toBeGreaterThan(0);

  let verifiedStructuredDefense = false;
  const tested = [];

  for (const source of sources) {
    await importUrl(page, source);
    tested.push(source.character_name || source.id);

    await expect(page.locator('#outfit-list [data-o="defense"]')).toHaveCount(0);
    await expect(page.locator('#outfit-list [data-o="mundane_modifier"]')).toHaveCount(0);
    await expect(page.locator('#outfit-list [data-o="electronic_control"]')).toHaveCount(0);

    const values = await structuredDefenseInputs(page).evaluateAll(nodes => nodes.map(node => String(node.value || "").trim()));
    if (values.some(Boolean)) verifiedStructuredDefense = true;

    await page.keyboard.press("Escape");
    if (verifiedStructuredDefense && tested.length >= 2) break;
  }

  expect(tested.length, "実URLを少なくとも1件取込済み").toBeGreaterThan(0);
  expect(verifiedStructuredDefense, `取込対象: ${tested.join(", ")}`).toBe(true);

  // 保存ボタンは押さない。取込後の編集状態だけを検証し、既存DBを変更しない。
});

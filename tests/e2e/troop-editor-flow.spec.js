import { test, expect } from "@playwright/test";
import { hasAuthCredentials, watchPageErrors, watchStaticAssetErrors } from "./helpers.js";

test("トループを作成・再読込・更新・閲覧・削除できる", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  const assertNoErrors = watchPageErrors(page);
  const assertNoAssetErrors = watchStaticAssetErrors(page);
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const initialName = `E2E TROOP ${unique}`;
  const updatedName = `${initialName} UPDATED`;
  let editUrl = "";

  try {
    await page.goto("/troop.html?edit=1");
    await expect(page.locator("#troop-editor")).toBeVisible();
    await page.locator("#troop-name").fill(initialName);
    await page.locator("#troop-style").selectOption({ label:"カタナ" });
    await page.locator("#troop-level").fill("3");
    await page.locator("#troop-member-max").fill("12");
    await page.locator("#troop-notes").fill("E2E create / reload / update / delete");

    await page.locator("#troop-combo-add").click();
    const comboDialog = page.locator("#troop-combo-dialog");
    await expect(comboDialog).toBeVisible();
    await comboDialog.locator('[name="name"]').fill("E2Eコンボ");
    await comboDialog.locator('[name="ability_choice"][value="reason"]').check();
    await comboDialog.locator('[name="modifier"]').fill("2");
    await comboDialog.locator('[name="expected_value"]').fill("18");
    await comboDialog.locator('[name="confrontation"]').fill("〈回避〉");
    await comboDialog.locator('[name="timing"]').fill("メジャー");
    await comboDialog.locator('[name="target"]').fill("単体");
    await comboDialog.locator('[name="range"]').fill("至近");
    await comboDialog.locator('[name="description"]').fill("CRUD回帰確認用");
    await comboDialog.locator('button[type="submit"]').click();
    await expect(comboDialog).toBeHidden();
    await expect(page.locator("#troop-combo-cards .combo-card")).toHaveCount(1);

    await page.locator('.troop-editor-actions button[type="submit"]').click();
    await expect(page.locator("#troop-editor-status")).toContainText("保存しました");
    await expect(page).toHaveURL(/troop\.html\?id=TRP-[A-Z0-9]+&edit=1/);
    editUrl = page.url();

    await page.reload();
    await expect(page.locator("#troop-editor")).toBeVisible();
    await expect(page.locator("#troop-name")).toHaveValue(initialName);
    await expect(page.locator("#troop-level")).toHaveValue("3");
    await expect(page.locator("#troop-member-max")).toHaveValue("12");
    await expect(page.locator("#troop-combo-cards .combo-card")).toHaveCount(1);

    await page.locator("#troop-combo-cards .combo-card").click();
    await expect(comboDialog.locator('[name="expected_value"]')).toHaveValue("18");
    await expect(comboDialog.locator('[name="confrontation"]')).toHaveValue("〈回避〉");
    await comboDialog.locator("#troop-combo-cancel").click();

    await page.locator("#troop-name").fill(updatedName);
    await page.locator('.troop-editor-actions button[type="submit"]').click();
    await expect(page.locator("#troop-editor-status")).toContainText("保存しました");

    const viewUrl = new URL(editUrl);
    viewUrl.searchParams.delete("edit");
    await page.goto(viewUrl.href);
    await expect(page.locator("#troop-view")).toBeVisible();
    await expect(page.locator("#troop-name-view")).toHaveText(updatedName);
    await expect(page.locator("#troop-level-view")).toHaveText("3");
    await expect(page.locator("#troop-member-max-view")).toHaveText("12");
    await expect(page.locator("#troop-combos-view .troop-view-combo")).toContainText("E2Eコンボ");

    await page.goto(editUrl);
    page.once("dialog", dialog => dialog.accept());
    await page.locator("#troop-delete").click();
    await expect(page).toHaveURL(/troops\.html/);
    editUrl = "";
  } finally {
    if (editUrl) {
      await page.goto(editUrl).catch(() => {});
      page.once("dialog", dialog => dialog.accept());
      await page.locator("#troop-delete").click({ timeout:5_000 }).catch(() => {});
    }
    assertNoErrors();
    assertNoAssetErrors();
  }
});

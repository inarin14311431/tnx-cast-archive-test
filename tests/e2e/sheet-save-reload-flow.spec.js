import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

test("スタイル技能の編集内容は保存・再読込後も候補表示まで維持される", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  const url = `/sheet.html?id=${getTestCastId()}`;
  await page.goto(url);
  await waitForEditorReady(page);

  const row = page.locator("#style-skills tbody tr[data-skill-key]:not(.style-skill-separator-row)").first();
  await expect(row).toBeVisible();

  const name = row.locator('[data-f="name"]');
  const level = row.locator('[data-f="level"]');
  const originalName = await name.inputValue();
  const originalLevel = await level.inputValue();
  const uniqueName = `E2E保存再読込${Date.now()}`;

  try {
    await name.fill(uniqueName);
    await level.fill("2");

    await page.locator("#save-button").click();
    await expect(page.locator("#save-status")).toHaveText("保存済み", { timeout: 15000 });

    await page.reload();
    await waitForEditorReady(page);

    const reloadedRow = page.locator("#style-skills tbody tr[data-skill-key]:not(.style-skill-separator-row)").first();
    await expect(reloadedRow.locator('[data-f="name"]')).toHaveValue(uniqueName);
    await expect(reloadedRow.locator('[data-f="level"]')).toHaveValue("2");

    await expect(page.locator(`#sheet-combo-skill-options input[data-skill-name="${uniqueName}"]`)).toHaveCount(1);
    await expect(page.locator(`#sheet-counter-skill option[value="${uniqueName}"]`)).toHaveCount(1);
  } finally {
    await page.goto(url);
    await waitForEditorReady(page);

    const restoreRow = page.locator("#style-skills tbody tr[data-skill-key]:not(.style-skill-separator-row)").first();
    await restoreRow.locator('[data-f="name"]').fill(originalName);
    await restoreRow.locator('[data-f="level"]').fill(originalLevel);
    await page.locator("#save-button").click();
    await expect(page.locator("#save-status")).toHaveText("保存済み", { timeout: 15000 });
  }
});

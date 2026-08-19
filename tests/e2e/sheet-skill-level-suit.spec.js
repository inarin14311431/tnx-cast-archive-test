import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

async function openEditor(page) {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);
}

test("技能LVとスートは追加・解除・LV4以上で同期する", async ({ page }) => {
  await openEditor(page);

  const rows = page.locator("#style-skills tbody tr[data-skill-key]:not(.style-skill-separator-row)");
  const before = await rows.count();
  await page.locator("#add-style-skill").click();
  await expect(rows).toHaveCount(before + 1);

  const row = rows.last();
  const level = row.locator('[data-f="level"]');
  const reason = row.locator('[data-f="reason"]');
  const passion = row.locator('[data-f="passion"]');
  const life = row.locator('[data-f="life"]');
  const mundane = row.locator('[data-f="mundane"]');

  await expect(level).toHaveValue("1");
  await reason.check();
  await passion.check();
  await expect(level).toHaveValue("2");

  await passion.uncheck();
  await expect(level).toHaveValue("1");

  await level.fill("4");
  for (const suit of [reason, passion, life, mundane]) await expect(suit).toBeChecked();

  await mundane.uncheck();
  await expect(level).toHaveValue("3");

  await row.locator("[data-delete-skill]").click();
  await expect(rows).toHaveCount(before);
});

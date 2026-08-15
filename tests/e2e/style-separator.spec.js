import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

test("スタイル技能の区切りを1行だけ追加でき操作ボタンも維持される", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);

  const rows = page.locator("#style-skills tbody tr[data-skill-key]");
  const separators = page.locator("#style-skills tbody tr.style-skill-separator-row[data-skill-key]");
  const beforeRows = await rows.count();
  const beforeSeparators = await separators.count();

  await page.locator("#add-style-separator").click();
  await expect(rows).toHaveCount(beforeRows + 1);
  await expect(separators).toHaveCount(beforeSeparators + 1);

  const divider = separators.last();
  await expect(divider.locator('[data-f="name"]')).toBeVisible();
  await expect(divider.locator('[data-f="name"]')).toHaveValue("");
  await expect(divider.locator('[data-skill-move="up"]')).toHaveCount(1);
  await expect(divider.locator('[data-skill-move="down"]')).toHaveCount(1);
  await expect(divider.locator('[data-delete-skill]')).toHaveCount(1);

  // style-skill-fields.js has finished rebuilding every row into the same stable column structure.
  await expect.poll(async () => divider.locator(":scope > td").count()).toBe(17);

  // Catch observer loops / accidental cell multiplication after the initial conversion settles.
  await page.waitForTimeout(750);
  await expect(rows).toHaveCount(beforeRows + 1);
  await expect(separators).toHaveCount(beforeSeparators + 1);
  await expect(divider.locator(":scope > td")).toHaveCount(17);
});

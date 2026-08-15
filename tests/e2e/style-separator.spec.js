import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

test("スタイル技能の区切りを1行だけ追加でき、上下移動後もレイアウトを維持する", async ({ page }) => {
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
  const key = await divider.getAttribute("data-skill-key");
  expect(key).toBeTruthy();
  await expect(divider.locator('[data-f="name"]')).toBeVisible();
  await expect(divider.locator('[data-f="name"]')).toHaveValue("");
  await expect(divider.locator('[data-skill-move="up"]')).toHaveCount(1);
  await expect(divider.locator('[data-skill-move="down"]')).toHaveCount(1);
  await expect(divider.locator('[data-delete-skill]')).toHaveCount(1);

  // Divider owns a dedicated two-cell DOM: title field + native action cell.
  await expect.poll(async () => divider.locator(":scope > td").count()).toBe(2);
  await expect(divider.locator(":scope > td").first()).toHaveClass(/style-separator-main/);
  await expect(divider.locator(":scope > td").last()).toHaveClass(/style-separator-actions/);

  // Reordering calls renderSkills() and rebuilds the table. The same divider must be
  // normalized again and keep the full table width instead of collapsing to the left.
  await divider.locator('[data-skill-move="up"]').click();
  const moved = page.locator(`#style-skills tbody tr[data-skill-key="${key}"]`);
  await expect(moved).toHaveClass(/style-skill-separator-row/);
  await expect.poll(async () => moved.locator(":scope > td").count()).toBe(2);
  await expect(moved.locator(":scope > td").first()).toHaveClass(/style-separator-main/);
  await expect(moved.locator(":scope > td").last()).toHaveClass(/style-separator-actions/);
  await expect.poll(async () => {
    const rowBox = await moved.boundingBox();
    const tableBox = await page.locator("#style-skills .style-skill-full-table").boundingBox();
    if (!rowBox || !tableBox) return 999;
    return Math.abs(rowBox.width - tableBox.width);
  }).toBeLessThan(4);

  // Catch observer loops / accidental cell multiplication after conversion settles.
  await page.waitForTimeout(750);
  await expect(rows).toHaveCount(beforeRows + 1);
  await expect(separators).toHaveCount(beforeSeparators + 1);
  await expect(moved.locator(":scope > td")).toHaveCount(2);
});

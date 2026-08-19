import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

async function openEditor(page) {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);
}

test("技能とアウトフィットの新規行は追加・編集・削除までブラウザ上で維持される", async ({ page }) => {
  await openEditor(page);

  const styleRows = page.locator("#style-skills tbody tr[data-skill-key]:not(.style-skill-separator-row)");
  const styleBefore = await styleRows.count();
  await page.locator("#add-style-skill").click();
  await expect(styleRows).toHaveCount(styleBefore + 1);

  const styleName = `E2E-STYLE-${Date.now()}`;
  const addedStyle = styleRows.last();
  await expect(addedStyle.locator('[data-f="level"]')).toHaveValue("1");
  await expect(addedStyle.locator('[data-f="skill_kind"]')).toHaveValue("normal");
  await addedStyle.locator('[data-f="name"]').fill(styleName);
  await expect(addedStyle.locator('[data-f="name"]')).toHaveValue(styleName);
  await addedStyle.locator("[data-delete-skill]").click();
  await expect(styleRows).toHaveCount(styleBefore);

  const generalRows = page.locator("#general-skills tbody tr[data-skill-key]");
  const generalBefore = await generalRows.count();
  await page.locator("#add-general").click();
  await expect(generalRows).toHaveCount(generalBefore + 1);

  const generalName = `E2E-GENERAL-${Date.now()}`;
  const addedGeneral = generalRows.last();
  await expect(addedGeneral.locator('[data-f="level"]')).toHaveValue("0");
  await expect(addedGeneral.locator('[data-f="skill_kind"]')).toHaveValue("proper");
  await addedGeneral.locator('[data-f="name"]').fill(generalName);
  await expect(page.locator("#general-skills tr[data-skill-key]").filter({ has: page.getByDisplayValue(generalName) })).toHaveCount(1);
  await page.locator("#general-skills tr[data-skill-key]").filter({ has: page.getByDisplayValue(generalName) }).locator("[data-delete-skill]").click();
  await expect(generalRows).toHaveCount(generalBefore);

  const outfitRows = page.locator("#outfit-list [data-outfit-key]");
  const outfitBefore = await outfitRows.count();
  await page.locator('[data-add-outfit-category="other"]').click();
  await expect(outfitRows).toHaveCount(outfitBefore + 1, { timeout: 10000 });

  const outfitName = `E2E-OUTFIT-${Date.now()}`;
  const newOtherRow = page.locator("#outfit-list .outfit-table-group--other .outfit-table-row").last();
  await expect(newOtherRow.locator('[data-o="category"]')).toHaveValue("other");
  await newOtherRow.locator('[data-o="name"]').fill(outfitName);

  let namedOutfit = page.locator("#outfit-list [data-outfit-key]").filter({ has: page.getByDisplayValue(outfitName) });
  await expect(namedOutfit).toHaveCount(1);
  await namedOutfit.locator('[data-o="category"]').selectOption("armor");

  namedOutfit = page.locator("#outfit-list [data-outfit-key]").filter({ has: page.getByDisplayValue(outfitName) });
  await expect(namedOutfit).toHaveCount(1, { timeout: 10000 });
  await expect(namedOutfit.locator('[data-o="category"]')).toHaveValue("armor");
  await expect(namedOutfit.locator('[data-o="control_modifier"]')).toBeVisible();
  await expect(namedOutfit.locator('[data-o="concealment"]')).toBeVisible();
  await namedOutfit.locator("[data-delete-outfit]").click();
  await expect(outfitRows).toHaveCount(outfitBefore);
});

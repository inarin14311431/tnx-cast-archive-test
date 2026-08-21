import { test, expect } from "@playwright/test";

test("転記画面の更新先URLは更新モードだけ表示される", async ({ page }) => {
  const characterSheetsRequests = [];
  page.on("request", request => {
    if (request.url().includes("character-sheets.appspot.com")) characterSheetsRequests.push(request.url());
  });

  await page.goto("/transfer.html");
  const updateField = page.locator(".update-target-field");

  await expect(updateField).toBeHidden();
  await page.getByRole("radio", { name: "既存キャストを更新" }).check();
  await expect(updateField).toBeVisible();
  await page.getByRole("radio", { name: "新規登録" }).check();
  await expect(updateField).toBeHidden();
  expect(characterSheetsRequests).toEqual([]);
});

test("保存したPOST転記ダイアログはiframe内にフォーカスがあってもEscapeで閉じる", async ({ page }) => {
  await page.goto("/tests/e2e/fixtures/direct-transfer-dialog.html");
  await page.getByRole("button", { name: "データ転記" }).click();

  const dialog = page.locator("dialog.cast-transfer-dialog");
  await expect(dialog).toBeVisible();

  const frame = page.frameLocator(".cast-transfer-dialog__frame");
  const sourceInput = frame.locator("#source-cast");
  await expect(sourceInput).toBeVisible();
  await sourceInput.focus();
  await sourceInput.press("Escape");

  await expect(dialog).toBeHidden();
});

test("通常キャスト転記はBM式を表示しPOSTトリガーを除去する", async ({ page }) => {
  await page.goto("/tests/e2e/fixtures/bookmarklet-transfer-mode.html?id=TNX-E2E");

  await expect(page.locator("html")).toHaveAttribute("data-transfer-mode", "bookmarklet");
  await expect(page.locator("#direct-transfer-button")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /転記TSV/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /転記BM/ })).toBeVisible();
});

test("PC編集画面のBM転記は編集DOMからTSVとBMを生成する", async ({ page }) => {
  await page.goto("/tests/e2e/fixtures/bookmarklet-transfer-editor.html?id=TNX-E2E");

  await expect(page.locator("html")).toHaveAttribute("data-transfer-mode", "bookmarklet");
  const tsvButton = page.locator("#transfer-tsv-copy-button");
  const bmButton = page.locator("#transfer-bookmarklet-copy-button");
  await expect(tsvButton).toBeVisible();
  await expect(bmButton).toBeVisible();

  await tsvButton.click();
  const tsv = await page.evaluate(() => window.__copiedText);
  expect(tsv).toContain("TNX_CAST_TRANSFER_TSV\t1\tbase\t0\tname\t転記テスト");
  expect(tsv).toContain("TNX_CAST_TRANSFER_TSV\t1\tstyle_skill\t0\tconfrontation\t回避");
  expect(tsv).toContain("TNX_CAST_TRANSFER_TSV\t1\toutfit\t0\tcontrol\t-2");
  expect(tsv).toContain("TNX_CAST_TRANSFER_TSV\t1\toutfit\t0\tprotecS\t3");
  expect(tsv).toContain("TNX_CAST_TRANSFER_TSV\t1\toutfit\t0\tprotecP\t4");
  expect(tsv).toContain("TNX_CAST_TRANSFER_TSV\t1\toutfit\t0\tprotecI\t5");

  await bmButton.click();
  const bookmarklet = await page.evaluate(() => window.__copiedText);
  expect(bookmarklet).toMatch(/^javascript:/);
  expect(bookmarklet).toContain("/js/tnx-transfer-bookmarklet.js?v=2");
});

test("BMスタイル技能転記は転記元より多い既存行を削除して経験点を一致させる", async ({ page }) => {
  await page.goto("/tests/e2e/fixtures/bookmarklet-style-row-trim.html");
  await expect(page.locator("html")).toHaveAttribute("data-fixture-ready", "1");

  const rows = page.locator("#superhumanskills tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(page.locator("#superhumanskills\\.0\\.name")).toHaveValue("†転記秘技");
  await expect(page.locator("#superhumanskills\\.001\\.name")).toHaveValue("転記特技");
  await expect(page.locator("#superhumanskills\\.0\\.expbase")).toHaveValue("20");
  await expect(page.locator("#superhumanskills\\.001\\.expbase")).toHaveValue("10");
  await expect(page.locator("#exp\\.superhumanskills")).toHaveValue("50");
  await expect(page.locator('input[value="余剰技能C"]')).toHaveCount(0);
  await expect(page.locator('input[value="余剰技能D"]')).toHaveCount(0);
});

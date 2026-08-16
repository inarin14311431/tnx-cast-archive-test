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

test("データ転記ダイアログはiframe内にフォーカスがあってもEscapeで閉じる", async ({ page }) => {
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

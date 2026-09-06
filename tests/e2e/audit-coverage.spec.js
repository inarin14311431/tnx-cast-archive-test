import { test, expect } from './safe-test.js';
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from './helpers.js';

const publicId = 'TNX-000029';
test('一覧・PC詳細・モバイル詳細で表示IDが一致する', async ({page}) => {
  await page.goto('/index.html');
  await page.getByRole('searchbox').fill('トリル');
  const card = page.locator(`.cast-card`).filter({has:page.locator(`a[href*="id=${publicId}"]`)});
  await expect(card).toHaveCount(1);
  const expected = await card.locator('.cast-card__serial').innerText();
  expect(expected).toMatch(/^TNX-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  await page.goto(`/cast.html?id=${publicId}&mobile=0`);
  await expect(page.locator('#cast-content')).toBeVisible();
  await expect(page.locator('#cast-public-id')).toHaveText(expected);
  await page.goto(`/cast.html?id=${publicId}&mobile=1`);
  await expect(page.locator('.mobile-cast-topbar > span')).toHaveText(expected);
});

test('スキャン演出ありでも表示が完了しタブを操作できる', async ({page}) => {
  await page.goto(`/cast.html?id=${publicId}&mobile=0&scan=full`);
  await expect(page.locator('.cast-access-overlay')).toBeVisible();
  await expect(page.locator('.cast-access-overlay')).toHaveCount(0, {timeout:15000});
  await expect(page.locator('#cast-content')).toBeVisible();
  const profile = page.getByRole('tab', {name:/プロフィール/});
  await profile.click();
  await expect(profile).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#tab-profile')).toBeVisible();
});

for (const mode of ['desktop','mobile']) {
  test(`主要編集画面の入力ラベルとリソース予算 ${mode}`, async ({page}) => {
    test.skip(!hasAuthCredentials(), '認証必須');
    await page.goto(`/${mode==='desktop'?'sheet':'sheet-mobile'}.html?id=${getTestCastId()}`);
    if (mode==='desktop') await waitForEditorReady(page);
    else await expect(page.locator('[data-mobile-character-field="character_name"]')).not.toHaveValue('');
    const selector = mode==='desktop' ? '#character-name' : '[data-mobile-character-field="character_name"]';
    await expect(page.locator(selector)).toHaveAccessibleName(/キャスト|名前|名称/);
    const metrics = await page.evaluate(() => ({
      nodes:document.querySelectorAll('*').length,
      resources:performance.getEntriesByType('resource').length,
      scripts:document.scripts.length,
      invalidReferences:[...document.querySelectorAll('[aria-labelledby]')].filter(el=>el.getAttribute('aria-labelledby').split(/\s+/).some(id=>!document.getElementById(id))).map(el=>el.id)
    }));
    expect(metrics.nodes).toBeLessThan(10000);
    expect(metrics.resources).toBeLessThan(220);
    expect(metrics.scripts).toBeLessThan(60);
    expect(metrics.invalidReferences).toEqual([]);
  });
}

test('取込ダイアログはキーボードで閉じられる', async ({page}) => {
  test.skip(!hasAuthCredentials(), '認証必須');
  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);
  await page.locator('#legacy-import-open').click();
  await expect(page.locator('#legacy-import-dialog')).toBeVisible();
  await expect(page.locator('#character-sheets-import-url')).toHaveAccessibleName('キャラクターシート倉庫URL');
  await page.keyboard.press('Escape');
  await expect(page.locator('#legacy-import-dialog')).toBeHidden();
});

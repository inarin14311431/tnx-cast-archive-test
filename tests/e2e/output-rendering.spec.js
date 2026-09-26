import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { quickCases, character } from '../fixtures/output-rendering.mjs';

// Isolated browser integration of the real entry modules. All data is synthetic;
// the Supabase module is replaced before loading, and external requests are blocked.
async function openIsolated(page, file, entry, tables) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1'
    ? route.continue() : route.abort());
  await page.route('**/js/supabase-client.js', route => route.fulfill({
    contentType: 'text/javascript', body: `
      const tables = ${JSON.stringify(tables)};
      export const supabase = { from(table) {
        let rows = tables[table] || [];
        const query = {
          select() { return query; },
          eq(key, value) { if (key === 'visibility') rows = rows.filter(row => row[key] === value); return query; },
          order() { return query; },
          maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }); },
          then(resolve) { return Promise.resolve({ data: rows, error: null }).then(resolve); }
        };
        return query;
      }};`
  }));
  await page.route('**/js/auth-state.js*', route => route.fulfill({
    contentType: 'text/javascript', body: 'export async function requireAuth() { return { id: "fixture-owner" }; }'
  }));
  const html = (await readFile(new URL(`../../${file}`, import.meta.url), 'utf8'))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace('</body>', `<script type="module" src="/js/${entry}"></script></body>`);
  await page.route(`**/${file}*`, route => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto(`/${file}?id=TNX-FIXTURE`);
  return errors;
}

test('簡易印刷の生成・解説切替・継続ページ・再表示でデータを維持する', async ({ page }) => {
  const data = structuredClone(quickCases[2].data);
  data.character.image_url = '';
  const errors = await openIsolated(page, 'cast.html', 'cast.js', {
    characters: [data.character], character_skills: data.skills,
    character_outfits: data.outfits, character_combos: data.combos
  });
  await expect(page.locator('#cast-status')).toHaveText('ACCESS GRANTED');
  await page.evaluate(() => localStorage.setItem('tnx-combo-usage:v1::TNX-FIXTURE', JSON.stringify({ combo: 2, counter: 1 })));
  await page.locator('#cast-quick-sheet-button').click();
  await expect(page.locator('#quick-sheet')).toBeVisible();
  await expect(page.locator('.quick-sheet__combo-grid')).toContainText('使用 2/3');
  await expect(page.locator('.quick-sheet__style-table tbody tr')).toHaveCount(45);
  await page.locator('#quick-sheet-detail-toggle').click();
  await expect(page.locator('#quick-sheet')).toHaveClass(/is-notes-expanded/);
  await expect(page.locator('[data-quick-sheet-section="style-skills-continuation"]')).toHaveCount(1);
  await expect(page.locator('.quick-sheet__style-table tbody tr')).toHaveCount(45);
  await expect(page.locator('.quick-sheet__page--continuation')).toHaveCount(1);
  await expect(page.locator('.quick-sheet__page--continuation .quick-sheet__page-header > b')).toHaveText('4 / 4');
  await page.locator('#quick-sheet-detail-toggle').click();
  await expect(page.locator('[data-quick-sheet-section="style-skills-continuation"]')).toHaveCount(0);
  await expect(page.locator('.quick-sheet__style-table tbody tr')).toHaveCount(45);
  await page.locator('#quick-sheet-close').click();
  await page.locator('#cast-quick-sheet-button').click();
  await expect(page.locator('.quick-sheet__combo-grid')).toContainText('使用 2/3');
  expect(errors).toEqual([]);
});

test('紹介生成UIは公開リンクを作り、非公開追加後は公開ボタンを無効化する', async ({ page }) => {
  const errors = await openIsolated(page, 'showcase-generator.html', 'showcase-generator-v3.js', {
    characters: [
      { ...character, visibility: 'public' },
      { ...character, id: 'private-fixture', public_id: 'PRIVATE-SECRET', visibility: 'private' }
    ]
  });
  await page.locator('[data-public-character-id="fixture"]').click();
  await page.locator('[data-selected-index="0"] [data-field="quote"]').selectOption('フェイト');
  await page.locator('#generate-button').click();
  await expect(page.locator('#publish-button')).toBeEnabled();
  await expect(page.frameLocator('#showcase-preview').locator('.cast-card__link')).toHaveAttribute('href', 'http://127.0.0.1:4173/cast.html?id=TNX-FIXTURE');
  await page.locator('[data-private-character-id="private-fixture"]').click();
  await page.locator('[data-selected-index="1"] [data-field="quote"]').selectOption('フェイト');
  await page.locator('#generate-button').click();
  await expect(page.locator('#publish-button')).toBeDisabled();
  await expect(page.locator('#download-button')).toBeEnabled();
  await expect(page.frameLocator('#showcase-preview').locator('#cast-2 .cast-card__link')).toHaveText('PRIVATE CAST // LOCAL OUTPUT');
  await expect(page.frameLocator('#showcase-preview').locator('body')).not.toContainText('PRIVATE-SECRET');
  expect(errors).toEqual([]);
});

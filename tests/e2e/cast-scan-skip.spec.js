import { test, expect } from './safe-test.js';

// The scan sequence of the public cast view (js/cast-cyberscan.js) can be skipped: a click anywhere, or Escape / Enter / Space.
// It only runs in an automated browser with ?scan=full (a visual test needs a stable page), on a desktop width, without
// prefers-reduced-motion.
const publicId = 'TNX-000029';
const SCAN_KEY = 'tnx-cast-scan-complete-v2';

async function openWithScan(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__scanEvents = [];
    window.addEventListener('tnx:cast-scan-complete', event => window.__scanEvents.push(event.detail));
  });
  await page.goto(`/cast.html?id=${publicId}&mobile=0&scan=full`);
  await expect(page.locator('.cast-access-overlay')).toBeVisible();
  return errors;
}

const storedAt = page => page.evaluate(key => sessionStorage.getItem(key), SCAN_KEY);

test('「CLICK TO SKIP」は演出中だけ出て、何もしなければ演出の終了とともに消える', async ({ page }) => {
  const errors = await openWithScan(page);
  const hint = page.locator('.cast-access-overlay .cast-scan-skip');
  await expect(hint).toBeVisible();
  await expect(hint).toContainText('CLICK TO SKIP');
  await expect(hint).toContainText('クリックでスキップ');
  // run to the end without skipping: the overlay and the hint go together
  await expect(page.locator('.cast-access-overlay')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('.cast-scan-skip')).toHaveCount(0);
  await expect(page.locator('#cast-content')).toBeVisible();
  expect(await page.evaluate(() => window.__scanEvents.map(detail => detail.skipped))).toEqual([false]);
  expect(errors).toEqual([]);
});

test('画面のどこをクリックしても、すぐに演出を終えて本文を表示し、演出を見た扱いにする', async ({ page }) => {
  const errors = await openWithScan(page);
  const before = Date.now();
  await page.mouse.click(400, 300);
  // the natural scan keeps the overlay for at least 3.6 seconds
  await expect(page.locator('.cast-access-overlay')).toHaveCount(0, { timeout: 1500 });
  expect(Date.now() - before).toBeLessThan(2500);
  await expect(page.locator('.cast-scan-skip')).toHaveCount(0);
  await expect(page.locator('#cast-content')).toBeVisible({ timeout: 15_000 });
  // recorded as seen: the next visit within ten minutes is the short one
  const stored = Number(await storedAt(page));
  expect(stored).toBeGreaterThan(Date.now() - 20_000);
  expect(stored).toBeLessThanOrEqual(Date.now());
  // the data rain stays, as after a full scan
  await expect(page.locator('.cast-data-rain')).toHaveCount(1);
  expect(await page.evaluate(() => window.__scanEvents.map(detail => detail.skipped))).toEqual([true]);
  await page.goto(`/cast.html?id=${publicId}&mobile=0&scan=full`);
  await expect(page.locator('body')).toHaveClass(/cast-scan-fast/);
  expect(errors).toEqual([]);
});

for (const key of ['Escape', 'Enter', 'Space']) {
  test(`${key} で演出を飛ばせる`, async ({ page }) => {
    const errors = await openWithScan(page);
    await page.keyboard.press(key);
    await expect(page.locator('.cast-access-overlay')).toHaveCount(0, { timeout: 1500 });
    await expect(page.locator('#cast-content')).toBeVisible({ timeout: 15_000 });
    expect(Number(await storedAt(page))).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
}

test('演出中のクリックは飛ばすためだけに使われ、下の要素には届かない', async ({ page }) => {
  await openWithScan(page);
  await page.evaluate(() => {
    window.__clicks = 0;
    document.addEventListener('click', () => { window.__clicks += 1; });
  });
  await page.mouse.click(400, 300);
  await expect(page.locator('.cast-access-overlay')).toHaveCount(0, { timeout: 1500 });
  expect(await page.evaluate(() => window.__clicks)).toBe(0);
});

test('演出が終わったあとのクリックとキー操作には影響しない', async ({ page }) => {
  await openWithScan(page);
  await page.mouse.click(400, 300);
  await expect(page.locator('.cast-access-overlay')).toHaveCount(0, { timeout: 1500 });
  await expect(page.locator('#cast-content')).toBeVisible({ timeout: 15_000 });

  const recordedAt = await storedAt(page);
  await page.evaluate(() => {
    window.__clicks = 0;
    window.__prevented = [];
    document.addEventListener('click', () => { window.__clicks += 1; });
    window.addEventListener('keydown', event => window.__prevented.push(event.defaultPrevented));
  });
  // a click on empty space does nothing: no second "scan complete", the record is not written again
  await page.mouse.click(10, 10);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__scanEvents.length)).toBe(1);
  expect(await storedAt(page)).toBe(recordedAt);
  expect(await page.evaluate(() => window.__clicks)).toBe(1);

  // links and buttons work as always
  const profile = page.getByRole('tab', { name: /プロフィール/ });
  await profile.click();
  await expect(profile).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#tab-profile')).toBeVisible();

  // keys are not taken: Escape / Enter / Space arrive unprevented
  for (const key of ['Escape', 'Enter', 'Space']) await page.keyboard.press(key);
  expect(await page.evaluate(() => window.__prevented.slice(-3))).toEqual([false, false, false]);
  expect(await page.evaluate(() => window.__scanEvents.length)).toBe(1);
});

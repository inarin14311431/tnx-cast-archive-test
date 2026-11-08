import { test, expect } from "@playwright/test";
import { hasAuthCredentials } from "./helpers.js";

// The scene composition choice of the generator (docs/ACT_SHOWCASE_SCENES.md section 6 #6). Every frame the sequence plays has a second pattern (b),
// so the real page offers a select for each of the six; the second test mounts the same selector with more frames
// that can play other patterns to check the whole path in the browser: the select, the hidden field, and what a restore writes.

test.beforeEach(() => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
});

async function openGenerator(page) {
  await page.goto("/showcase-generator.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-showcase-generator-state", "ready", { timeout: 20_000 });
}

test("the generator offers six composition choices: the loading, title, trailer, handout-assign, ready and finale frames' pattern b; the choice lands in the hidden field", async ({ page }) => {
  await openGenerator(page);
  // every frame can play a second pattern, so each has a select
  const host = page.locator("#showcase-scene-composition");
  await expect(host).toBeVisible();
  await expect(host.locator("select")).toHaveCount(6);
  const loading = host.locator('select[data-scene-frame="loading"]');
  const title = host.locator('select[data-scene-frame="title"]');
  const trailer = host.locator('select[data-scene-frame="trailer"]');
  const assign = host.locator('select[data-scene-frame="handout-assign"]');
  const ready = host.locator('select[data-scene-frame="ready"]');
  const finale = host.locator('select[data-scene-frame="finale"]');
  for (const select of [loading, title, trailer, assign, ready, finale]) {
    await expect(select.locator("option")).toHaveText(["パターン A", "パターン B"]);
    await expect(select).toHaveValue("a");
  }
  await expect(page.locator("#showcase-scenes")).toHaveValue("");
  await trailer.selectOption("b");
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"trailer":"b"}');
  await title.selectOption("b");
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"title":"b","trailer":"b"}');
  await assign.selectOption("b");
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"title":"b","trailer":"b","handout-assign":"b"}');
  await ready.selectOption("b");
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"title":"b","trailer":"b","handout-assign":"b","ready":"b"}');
  await finale.selectOption("b");
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"title":"b","trailer":"b","handout-assign":"b","ready":"b","finale":"b"}');
  await finale.selectOption("a");
  await ready.selectOption("a");
  await assign.selectOption("a");
  await trailer.selectOption("a");
  await title.selectOption("a");
  await expect(page.locator("#showcase-scenes")).toHaveValue("");
  await loading.selectOption("b");
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"loading":"b"}');
  await loading.selectOption("a");
  await expect(page.locator("#showcase-scenes")).toHaveValue("");
});

test("a frame that can play b gets a select that writes the hidden field and follows a restore", async ({ page }) => {
  await openGenerator(page);
  // The page's own selector module loads after "ready" and mounts with the real SCENE_PATTERNS (replacing any earlier mount),
  // so mount the b-capable frames only once the module after it (edit-restore, imported next) has loaded.
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType("resource").some(entry => /\/js\/showcase-edit-restore\.js/.test(entry.name) && entry.responseEnd > 0)), { timeout: 20_000 }).toBe(true);
  await page.evaluate(async () => {
    const selector = await import("/js/showcase-scene-selector.js");
    selector.mountSceneSelector({
      host: document.querySelector("#showcase-scene-composition"),
      field: document.querySelector("#showcase-scenes"),
      patterns: { loading: ["a"], title: ["a", "b"], trailer: ["a"], "handout-assign": ["a"], ready: ["a", "b", "c"], finale: ["a"] }
    });
  });
  const host = page.locator("#showcase-scene-composition");
  await expect(host).toBeVisible();
  await expect(host.locator("select")).toHaveCount(2);

  await host.locator('select[data-scene-frame="title"]').selectOption("b");
  await host.locator('select[data-scene-frame="ready"]').selectOption("c");
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"title":"b","ready":"c"}');

  await host.locator('select[data-scene-frame="title"]').selectOption("a");
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"ready":"c"}');

  // what the restore of an owned showcase does: write the field and fire input
  await page.evaluate(() => {
    const field = document.querySelector("#showcase-scenes");
    field.value = '{"title":"b"}';
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(host.locator('select[data-scene-frame="title"]')).toHaveValue("b");
  await expect(host.locator('select[data-scene-frame="ready"]')).toHaveValue("a");
});

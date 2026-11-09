import { test, expect } from "@playwright/test";
import { hasAuthCredentials } from "./helpers.js";

// The scene composition choice of the generator (docs/ACT_SHOWCASE_SCENES.md section 6 #6). Every frame the sequence plays has a second pattern (b),
// so the real page offers a row of "A 標準" / "B:<name>" buttons for each of the six (the block is folded under "演出の構成"); the second test
// mounts the same selector with more frames that can play other patterns to check the whole path in the browser: the buttons, the hidden field,
// and what a restore writes. The first test pins the names; tests/e2e/showcase-generator-look.spec.js covers the same block without a login.

test.beforeEach(() => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
});

async function openGenerator(page) {
  await page.goto("/showcase-generator.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-showcase-generator-state", "ready", { timeout: 20_000 });
}

const button = (page, frame, pattern) => page.locator(`#showcase-scene-composition button[data-scene-frame="${frame}"][data-scene-pattern="${pattern}"]`);

test("the generator offers six composition choices: the loading, title, trailer, handout-assign, ready and finale frames' pattern b; the choice lands in the hidden field", async ({ page }) => {
  await openGenerator(page);
  // every frame can play a second pattern, so each has a row of buttons; the block opens from its summary
  const host = page.locator("#showcase-scene-composition");
  await expect(host).toBeVisible();
  await expect(host.locator(".look-scenes__badge")).toHaveText("豪華版のみ");
  await host.locator("summary").click();
  await expect(host.locator(".scene-choice")).toHaveCount(6);
  const frames = ["loading", "title", "trailer", "handout-assign", "ready", "finale"];
  const names = { loading: "B:起動ターミナル", title: "B:タイトルカード", trailer: "B:縦組み", "handout-assign": "B:ポートレート先行", ready: "B:ポートレート中央", finale: "B:キービジュアル" };
  for (const frame of frames) {
    await expect(host.locator(`button[data-scene-frame="${frame}"]`)).toHaveText(["A 標準", names[frame]]);
    await expect(button(page, frame, "a")).toHaveAttribute("aria-pressed", "true");
    await expect(button(page, frame, "b")).toHaveAttribute("aria-pressed", "false");
  }
  await expect(page.locator("#showcase-scenes")).toHaveValue("");
  await button(page, "trailer", "b").click();
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"trailer":"b"}');
  await button(page, "title", "b").click();
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"title":"b","trailer":"b"}');
  await button(page, "handout-assign", "b").click();
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"title":"b","trailer":"b","handout-assign":"b"}');
  await button(page, "ready", "b").click();
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"title":"b","trailer":"b","handout-assign":"b","ready":"b"}');
  await button(page, "finale", "b").click();
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"title":"b","trailer":"b","handout-assign":"b","ready":"b","finale":"b"}');
  for (const frame of ["finale", "ready", "handout-assign", "trailer", "title"]) await button(page, frame, "a").click();
  await expect(page.locator("#showcase-scenes")).toHaveValue("");
  await button(page, "loading", "b").click();
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"loading":"b"}');
  await button(page, "loading", "a").click();
  await expect(page.locator("#showcase-scenes")).toHaveValue("");
});

test("a frame that can play b gets buttons that write the hidden field and follow a restore", async ({ page }) => {
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
  await host.locator("summary").click();
  await expect(host.locator(".scene-choice")).toHaveCount(2);

  await button(page, "title", "b").click();
  await button(page, "ready", "c").click();
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"title":"b","ready":"c"}');
  await expect(host.locator("[data-scene-summary]")).toHaveText("B:タイトル / C:ACT READY / ほかは A");

  await button(page, "title", "a").click();
  await expect(page.locator("#showcase-scenes")).toHaveValue('{"ready":"c"}');

  // what the restore of an owned showcase does: write the field and fire input
  await page.evaluate(() => {
    const field = document.querySelector("#showcase-scenes");
    field.value = '{"title":"b"}';
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(button(page, "title", "b")).toHaveAttribute("aria-pressed", "true");
  await expect(button(page, "ready", "a")).toHaveAttribute("aria-pressed", "true");
});

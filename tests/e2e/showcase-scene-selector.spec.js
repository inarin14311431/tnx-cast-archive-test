import { test, expect } from "@playwright/test";
import { hasAuthCredentials } from "./helpers.js";

// The scene composition choice of the generator (docs/ACT_SHOWCASE_SCENES.md section 6 #6). Only pattern "a" exists for every frame
// now, so the real page shows nothing; the second test mounts the same selector with a frame that can play "b" to check the whole
// path in the browser: the select, the hidden field, and what a restore writes.

test.beforeEach(() => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
});

async function openGenerator(page) {
  await page.goto("/showcase-generator.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-showcase-generator-state", "ready", { timeout: 20_000 });
}

test("while every frame can play only pattern a, the generator offers no composition choice", async ({ page }) => {
  await openGenerator(page);
  await expect(page.locator("#showcase-scene-composition")).toBeHidden();
  await expect(page.locator("#showcase-scene-composition select")).toHaveCount(0);
  await expect(page.locator("#showcase-scenes")).toHaveValue("");
});

test("a frame that can play b gets a select that writes the hidden field and follows a restore", async ({ page }) => {
  await openGenerator(page);
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

import { test, expect } from "@playwright/test";
import { ACT_SLUG, installActShowcaseRoutes, showcaseData } from "./fixtures/act-showcase-data.js";

// docs/ACT_SHOWCASE_SCENES.md §6 #4: every screen of the deluxe showcase carries the scene frame it belongs to and the
// pattern drawing it (data-scene / data-scene-pattern), from the moment it is inserted. The marks are set while the
// element is detached, so no MutationObserver (the existing ones filter on class / aria-hidden) ever sees them change.

test("各画面は挿入された時点で data-scene / data-scene-pattern を持ち、属性の変化は一度も起きない", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    const record = { inserted: [], attributeChanges: [] };
    window.__sceneMarks = record;
    new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          record.attributeChanges.push(`${mutation.target.className} ${mutation.attributeName}`);
          continue;
        }
        for (const added of mutation.addedNodes) {
          if (added.nodeType !== Node.ELEMENT_NODE || !added.matches(".neotokyo-sequence__screen")) continue;
          record.inserted.push({ scene: added.dataset.scene ?? null, pattern: added.dataset.scenePattern ?? null });
        }
      }
    }).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-scene", "data-scene-pattern"]
    });
  });
  await installActShowcaseRoutes(page);
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}`);

  const root = page.locator("#act-showcase-root");
  await expect(root).toHaveAttribute("data-scene", "finale");
  await expect(root).toHaveAttribute("data-scene-pattern", "a");

  // Walk the sequence on its NEXT button, then open the page itself from ACT READY.
  const advance = page.locator(".neotokyo-sequence__advance");
  const access = page.locator(".neotokyo-finale__access-button");
  for (let step = 0; step < 20; step += 1) {
    if (await access.isVisible()) break;
    await expect(advance).toBeVisible({ timeout: 15_000 });
    const label = ((await advance.textContent()) || "").trim();
    await advance.click({ force: true });
    await expect.poll(async () => await access.isVisible()
      || (await advance.isVisible() && ((await advance.textContent()) || "").trim() !== label), { timeout: 15_000 }).toBe(true);
  }
  await expect(access).toBeVisible({ timeout: 15_000 });
  await access.click({ force: true });
  await expect(page.locator("#cinematic-intro")).toHaveCount(0, { timeout: 8_000 });

  const record = await page.evaluate(() => window.__sceneMarks);
  // one screen per frame, handout-assign once per PC (the assignment happens inside the same section)
  const handoutAssign = showcaseData.casts.map(() => "handout-assign");
  expect(record.inserted.map(screen => screen.scene)).toEqual(["loading", "title", "trailer", ...handoutAssign, "ready"]);
  expect(record.inserted.every(screen => screen.pattern === "a")).toBe(true);
  expect(record.attributeChanges).toEqual([]);
  // the page itself keeps its marks after the sequence
  await expect(root).toHaveAttribute("data-scene", "finale");
});

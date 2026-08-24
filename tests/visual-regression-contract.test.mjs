import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => readFile(path.join(root, relative), "utf8");

test("visual regression uses fixed projects, data and a pinned browser container", async () => {
  const [config, workflow, fixtures] = await Promise.all([
    read("playwright.visual.config.js"),
    read(".github/workflows/visual-regression.yml"),
    read("tests/visual/visual-fixtures.js")
  ]);

  assert.match(config, /name:\s*"visual-desktop"/);
  assert.match(config, /name:\s*"visual-mobile"/);
  assert.match(config, /process\.env\.CI\s*\?\s*"none"/);
  assert.match(config, /maxDiffPixelRatio:\s*0\.006/);
  assert.match(workflow, /mcr\.microsoft\.com\/playwright:v1\.55\.0-noble/);
  assert.match(workflow, /npm run visual/);
  assert.doesNotMatch(workflow, /update-snapshots/);
  assert.match(fixtures, /VISUAL_CAST_ID/);
  assert.match(fixtures, /VISUAL_TROOP_ID/);
});

test("committed reference screenshots cover both viewports and all themes", async () => {
  const screenshotRoot = path.join(root, "tests/visual/__screenshots__");
  const desktop = await readdir(path.join(screenshotRoot, "visual-desktop"), { recursive:true });
  const mobile = await readdir(path.join(screenshotRoot, "visual-mobile"), { recursive:true });
  const desktopPngs = desktop.filter(name => name.endsWith(".png"));
  const mobilePngs = mobile.filter(name => name.endsWith(".png"));

  assert.ok(desktopPngs.length >= 30, `desktop baselines: ${desktopPngs.length}`);
  assert.ok(mobilePngs.length >= 10, `mobile baselines: ${mobilePngs.length}`);
  for (const theme of ["nova", "intron", "orbital", "spectrum-neon", "japanese-army", "statistics-bureau"]) {
    assert.ok(desktopPngs.some(name => name.includes(`theme-${theme}.png`)), `missing theme baseline: ${theme}`);
  }
});

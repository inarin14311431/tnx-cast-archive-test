import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const regression = await readFile(new URL("../.github/workflows/regression.yml", import.meta.url), "utf8");
const security = await readFile(new URL("../.github/workflows/security.yml", import.meta.url), "utf8");
const playwright = await readFile(new URL("../.github/workflows/playwright.yml", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("release candidate routes regression CI through the full non-security verification gate", () => {
  assert.match(regression, /npm run verify/);

  const verify = packageJson.scripts?.verify || "";
  for (const command of [
    "npm run check:js",
    "npm run audit:modules",
    "npm run audit:integrity",
    "npm run audit:css",
    "npm run audit:themes",
    "npm run audit:sheet",
    "npm run audit:cast",
    "npm run audit:troop",
    "npm run audit:mobile",
    "npm run report:sheet-ownership",
    "npm run report:cast-ownership",
    "npm run test:all"
  ]) {
    assert.match(verify, new RegExp(escapeRegExp(command)));
  }
  assert.doesNotMatch(verify, /npm run audit:security/);
});

test("release candidate keeps security as an independent required workflow", () => {
  assert.match(security, /npm run audit:security/);
  assert.match(packageJson.scripts?.["audit:security"] || "", /node scripts\/audit-security\.mjs/);
});

test("release candidate keeps critical PC/public E2E paths", () => {
  for (const spec of [
    "tests/e2e/smoke.spec.js",
    "tests/e2e/cast-view.spec.js",
    "tests/e2e/troop-view.spec.js",
    "tests/e2e/authenticated.spec.js",
    "tests/e2e/legacy-import-profile.spec.js",
    "tests/e2e/outfit-import-transfer.spec.js",
    "tests/e2e/sheet-row-lifecycle.spec.js",
    "tests/e2e/sheet-save-reload-flow.spec.js",
    "tests/e2e/style-marks.spec.js",
    "tests/e2e/style-separator.spec.js",
    "tests/e2e/style-skill-detail-integrity.spec.js"
  ]) {
    assert.match(playwright, new RegExp(escapeRegExp(spec)));
  }
});

test("release candidate keeps critical mobile E2E paths and matching browser image", () => {
  for (const spec of [
    "tests/e2e/account-mobile.spec.js",
    "tests/e2e/troop-view.spec.js",
    "tests/e2e/mobile-combo-counter.spec.js",
    "tests/e2e/mobile-experience.spec.js"
  ]) {
    assert.match(playwright, new RegExp(escapeRegExp(spec)));
  }

  const playwrightVersion = packageJson.devDependencies?.["@playwright/test"];
  assert.ok(playwrightVersion, "@playwright/test must be pinned in package.json");
  assert.match(
    playwright,
    new RegExp(`mcr\\.microsoft\\.com/playwright:v${escapeRegExp(playwrightVersion)}-noble`)
  );
});

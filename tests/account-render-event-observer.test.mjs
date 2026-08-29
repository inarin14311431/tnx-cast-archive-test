import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const accountSource = await readFile(new URL("../js/account.js", import.meta.url), "utf8");
const iconSource = await readFile(new URL("../js/account-action-icons.js", import.meta.url), "utf8");
const manifestSource = await readFile(new URL("../runtime-observer-manifest.json", import.meta.url), "utf8");

test("account publishes an explicit owned-cast render event after list rendering", () => {
  assert.match(accountSource, /const OWNED_CASTS_RENDER_EVENT = "tnx:owned-casts-rendered"/);
  assert.match(accountSource, /ownedCastsContainer\.dispatchEvent\(new CustomEvent\(OWNED_CASTS_RENDER_EVENT\)\)/);
});

test("account action icons consume the render event without observing owned-casts DOM", () => {
  assert.match(iconSource, /root\?\.addEventListener\(RENDER_EVENT, enhance\)/);
  assert.doesNotMatch(iconSource, /MutationObserver/);
  assert.doesNotMatch(manifestSource, /js\/account-action-icons\.js/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ofcSource = await readFile(new URL("../js/outfit-ofc-fields.js", import.meta.url), "utf8");
const layoutSource = await readFile(new URL("../js/outfit-display-rules-v5.js", import.meta.url), "utf8");

test("OFC hydration explicitly notifies the layout controller after async field restoration", () => {
  assert.match(ofcSource, /tnx:outfit-ofc-fields-ready/);
  assert.match(ofcSource, /dispatchEvent\(new CustomEvent\(OFC_READY_EVENT/);
});

test("outfit layout reapplies when async OFC hydration completes", () => {
  assert.match(layoutSource, /tnx:outfit-ofc-fields-ready/);
  assert.match(layoutSource, /addEventListener\(OFC_READY_EVENT,\s*queueApply/);
});

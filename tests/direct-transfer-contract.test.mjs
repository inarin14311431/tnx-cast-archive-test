import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("direct transfer keeps update-only UI hidden in new-registration mode", async () => {
  const html = await read("transfer.html");
  const script = await read("js/transfer.js");

  assert.match(html, /class="update-only update-target-field" hidden/);
  assert.match(script, /updateOnly\.forEach\(node => \{ node\.hidden = !isUpdate; \}\)/);
  assert.match(script, /updateUrlInput\.disabled = !isUpdate/);
  assert.match(script, /updateUrlInput\.required = isUpdate/);
});

test("direct transfer posts into the result iframe without automatic external navigation", async () => {
  const script = await read("js/transfer.js");

  assert.match(script, /outbound\.target = responseFrame\.name/);
  assert.doesNotMatch(script, /outbound\.target\s*=\s*["']_blank["']/);
  assert.match(script, /submitButton\.disabled = true/);
  assert.match(script, /outboundSubmissionPending = true/);
  assert.doesNotMatch(script, /setInterval\s*\(/);
});

test("direct transfer dialog supports Escape from parent and same-origin iframe", async () => {
  const script = await read("js/direct-transfer-button.js");

  assert.match(script, /event\.key !== "Escape"/);
  assert.match(script, /dialog\.addEventListener\("cancel"/);
  assert.match(script, /frame\.contentDocument\?\.addEventListener\("keydown", closeDialogOnEscape, true\)/);
  assert.match(script, /document\.addEventListener\("keydown", closeDialogOnEscape, true\)/);
});

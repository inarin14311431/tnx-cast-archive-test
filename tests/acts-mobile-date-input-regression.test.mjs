import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const entry = fs.readFileSync("css-next/pages/acts-entry.css", "utf8");
const mobile = fs.readFileSync("css-next/pages/acts-mobile-fixes.css", "utf8");

test("acts entry loads the dedicated mobile containment fixes", () => {
  assert.match(entry, /acts-mobile-fixes\.css\?v=1/);
});

test("iOS date input stays inside the spending form column", () => {
  assert.match(mobile, /\.experience-spending-form,\s*\n\.experience-spending-form > label\s*\{[\s\S]*min-width:\s*0/s);
  assert.match(mobile, /input\[type="date"\][\s\S]*width:\s*100%[\s\S]*min-width:\s*0[\s\S]*max-width:\s*100%[\s\S]*box-sizing:\s*border-box/s);
  assert.match(mobile, /@media \(max-width:\s*560px\)[\s\S]*inline-size:\s*100%[\s\S]*min-inline-size:\s*0[\s\S]*max-inline-size:\s*100%/s);
});

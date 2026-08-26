import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const entry = fs.readFileSync("css-next/pages/acts-entry.css", "utf8");
const maintenance = fs.readFileSync("css-next/pages/acts-maintenance.css", "utf8");

test("acts entry loads consolidated maintenance adjustments", () => {
  assert.match(entry, /acts-maintenance\.css\?v=4/);
});

test("iOS date input stays inside the spending form column", () => {
  assert.match(maintenance, /\.experience-spending-form,\s*\n\.experience-spending-form > label\s*\{[\s\S]*min-width:\s*0/s);
  assert.match(maintenance, /input\[type="date"\][\s\S]*width:\s*100%[\s\S]*min-width:\s*0[\s\S]*max-width:\s*100%[\s\S]*box-sizing:\s*border-box/s);
  assert.match(maintenance, /@media \(max-width:\s*560px\)[\s\S]*inline-size:\s*100%[\s\S]*min-inline-size:\s*0[\s\S]*max-inline-size:\s*100%/s);
});

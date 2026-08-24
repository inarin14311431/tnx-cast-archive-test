import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("archive and account entries own the shared style-mark presentation", async () => {
  const [archive, account, sheet, index] = await Promise.all([
    read("css-next/pages/archive-entry.css"),
    read("css-next/pages/account-entry.css"),
    read("css-next/pages/sheet-entry.css"),
    read("css-next/index.css")
  ]);

  assert.match(archive, /components\/style-marks\.css\?v=1/);
  assert.match(account, /components\/style-marks\.css\?v=1/);
  assert.doesNotMatch(sheet, /components\/style-marks\.css/);
  assert.doesNotMatch(index, /components\/style-marks\.css/);
});

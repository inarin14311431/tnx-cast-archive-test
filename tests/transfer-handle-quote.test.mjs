import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = (await readFile(new URL("../js/tnx-transfer-handle-repair.js", import.meta.url), "utf8")).replaceAll(String.fromCharCode(13), "");
const start = source.indexOf("  function quoteHandle(");
const end = source.indexOf("  function repair()");
assert.ok(start >= 0 && end > start);
const context = { clean: value => String(value ?? "").trim() };
vm.runInNewContext(`${source.slice(start, end)}; globalThis.api = { quoteHandle, joinHandleAndName };`, context);
const { quoteHandle, joinHandleAndName } = context.api;

test("a handle is wrapped in one pair of quotes, whatever it had before", () => {
  for (const handle of ["火星よりも遠く", "“火星よりも遠く”", "””火星よりも遠く””", "““火星よりも遠く””", "\"火星よりも遠く\"", "＂火星よりも遠く＂", " “火星よりも遠く” "]) {
    assert.equal(quoteHandle(handle), "“火星よりも遠く”");
  }
});

test("quotes inside the handle stay, an empty handle adds nothing", () => {
  assert.equal(quoteHandle("火星“より”遠く"), "“火星“より”遠く”");
  assert.equal(quoteHandle(""), "");
  assert.equal(quoteHandle("“”"), "");
  assert.equal(joinHandleAndName(quoteHandle(""), "プルケ・アガヴェ"), "プルケ・アガヴェ");
  assert.equal(joinHandleAndName(quoteHandle("火星よりも遠く"), "プルケ・アガヴェ"), "“火星よりも遠く” プルケ・アガヴェ");
});

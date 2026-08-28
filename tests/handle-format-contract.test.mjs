import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function loadHandleFormat() {
  const source = fs.readFileSync("js/handle-format.js", "utf8");
  const window = {};
  const document = {
    readyState: "loading",
    addEventListener() {},
    querySelector() { return null; }
  };
  const context = vm.createContext({ window, document, console, Event: class Event {} });
  vm.runInContext(source, context);
  return window.TNXHandleFormat;
}

test("handle display always has exactly one outer quote pair", () => {
  const format = loadHandleFormat();
  for (const value of [
    "メラキ",
    '"メラキ"',
    "“メラキ”",
    "”メラキ”",
    "““メラキ””",
    '”"メラキ"”'
  ]) {
    assert.equal(format.quoteHandle(value), "“メラキ”");
  }
});

test("handle reading follows the same quote normalization rule", () => {
  const format = loadHandleFormat();
  assert.equal(format.quoteHandle("“ヨゴイ”"), "“ヨゴイ”");
  assert.equal(format.quoteHandle("””ヨゴイ””"), "“ヨゴイ”");
});

test("composite cast identity parsing keeps handle and character name separate", () => {
  const format = loadHandleFormat();
  const parsed = format.splitQuotedIdentity("“メラキ” 夜刀 秋");
  assert.equal(parsed.handle, "メラキ");
  assert.equal(parsed.name, "夜刀 秋");

  const plain = format.splitQuotedIdentity("夜刀 秋");
  assert.equal(plain.handle, "");
  assert.equal(plain.name, "夜刀 秋");
});

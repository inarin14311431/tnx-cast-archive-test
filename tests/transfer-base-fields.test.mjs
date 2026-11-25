import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = (await readFile(new URL("../js/tnx-transfer-base.js", import.meta.url), "utf8")).replaceAll(String.fromCharCode(13), "");
const start = source.indexOf("  const DEFAULT_BIRTHPLACE=");
const end = source.indexOf("  function setBase(base)");
assert.ok(start >= 0 && end > start);

function sandbox(controls) {
  const context = {
    clean: value => String(value ?? "").trim(),
    results: { set: 0 },
    notify() {},
    setElement: (element, value) => { element.value = value; },
    document: { getElementById: id => controls[id] || null }
  };
  vm.runInNewContext(`${source.slice(start, end)}; globalThis.api = { setBirthplace, setUtsuwaElement };`, context);
  return context.api;
}

test("the default birthplace fills an empty field only; a chosen one replaces it", () => {
  const run = (value, before) => {
    const element = { value: before };
    sandbox({ "base.birth": element }).setBirthplace(value);
    return element.value;
  };
  assert.equal(run("Ｎ◎ＶＡ", ""), "Ｎ◎ＶＡ");
  assert.equal(run("Ｎ◎ＶＡ", "ヨコハマ"), "ヨコハマ");
  assert.equal(run("軌道", "ヨコハマ"), "軌道");
  assert.equal(run("", "ヨコハマ"), "ヨコハマ");
});

test("only a listed utsuwa element of a ウツワ style is selected", () => {
  const run = (style, position = 1) => {
    const element = { value: "雷神", options: [{ value: "雷神", textContent: "雷神" }, { value: "運命神", textContent: "運命神" }] };
    const done = sandbox({ "styles.utsuwa.element2": element }).setUtsuwaElement(style, position);
    return [done, element.value];
  };
  assert.deepEqual(run({ name: "ウツワ", attribute: "運命神" }), [true, "運命神"]);
  assert.deepEqual(run({ name: "ウツワ", attribute: "不明" }), [false, "雷神"]);
  assert.deepEqual(run({ name: "カゼ", attribute: "運命神" }), [false, "雷神"]);
  assert.deepEqual(run({ name: "ウツワ", attribute: "運命神" }, 0), [false, "雷神"]);
});

test("weapon defense is transferred and other categories do not send it", () => {
  assert.match(source, /defense:record\.category==="weapon"\?record\.defense:""/);
});

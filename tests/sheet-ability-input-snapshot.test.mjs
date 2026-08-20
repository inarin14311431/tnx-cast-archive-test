import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { collectAbilityInputSnapshot } from "../js/sheet-ability-input-snapshot.js";

function fakeRoot(values = {}) {
  return {
    querySelector(selector) {
      if (!Object.hasOwn(values, selector)) return null;
      return { value: values[selector] };
    }
  };
}

test("ability input snapshot collects ability control and CS values", () => {
  const snapshot = collectAbilityInputSnapshot({
    root: fakeRoot({
      "#reason-base": "7",
      "#reason-mod": "2",
      "#reason-control-base": "12",
      "#reason-control-mod": "-1",
      "#cs-base": "8",
      "#cs-mod": "3"
    }),
    abilities: [["reason"]]
  });

  assert.deepEqual(snapshot, {
    values: {
      reason: {
        current: 7,
        modifier: 2,
        controlCurrent: 12,
        controlModifier: -1
      }
    },
    cs: { current: 8, modifier: 3 }
  });
});

test("missing and blank controls normalize to zero", () => {
  const snapshot = collectAbilityInputSnapshot({
    root: fakeRoot({ "#reason-base": "" }),
    abilities: [["reason"]]
  });
  assert.deepEqual(snapshot.values.reason, {
    current: 0,
    modifier: 0,
    controlCurrent: 0,
    controlModifier: 0
  });
  assert.deepEqual(snapshot.cs, { current: 0, modifier: 0 });
});

test("classic sheet delegates ability and CS DOM reads to snapshot module", async () => {
  const source = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  assert.match(source, /sheet-ability-input-snapshot\.js\?v=1/);
  assert.match(source, /collectAbilityInputSnapshot/);
  assert.doesNotMatch(source, /function currentAbilityValues\(/);
  assert.doesNotMatch(source, /function current\(id\)/);
});

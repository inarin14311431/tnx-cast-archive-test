import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { resolveStyleBaselineValue } from "../js/sheet-baseline-adjustment.js";
import { steppedExperienceCost, resolveCanonicalCurrent } from "../js/sheet-experience-rules.js";
import { assertVersionedMatch } from "./helpers/cache-version.mjs";

const source = await readFile(new URL("../js/sheet-mobile-style.js", import.meta.url), "utf8");

// The module runs init() on import (needs the DOM), so the real adjustBaseline is lifted out of the source and
// run against a plain object, exactly as the mobile editor calls it.
function loadAdjustBaseline() {
  const start = source.indexOf("function adjustBaseline(");
  const end = source.indexOf("\nfunction applyEditor(", start);
  assert.ok(start > 0 && end > start, "adjustBaseline must still be a top-level function before applyEditor");
  const context = { character: null, num: value => Number(value || 0), resolveStyleBaselineValue };
  vm.createContext(context);
  vm.runInContext(`${source.slice(start, end)}\nthis.adjustBaseline = adjustBaseline;`, context);
  return (character, key, oldBaseline, nextBaseline) => {
    context.character = character;
    context.adjustBaseline(key, oldBaseline, nextBaseline);
    return character;
  };
}
const adjust = loadAdjustBaseline();

// PC: sheet.js adjustBaseline() -> element.value = resolveStyleBaselineValue(element.value, old, new)
test("a raised ability is kept on a style change, like on PC", () => {
  const cast = { reason_base: 5, reason_growth: 2, reason_gear: 1, reason_manual: 0 };
  adjust(cast, "reason", 3, 4);
  assert.equal(cast.reason_base, resolveStyleBaselineValue(5, 3, 4));
  assert.equal(cast.reason_base, 5);
  assert.equal(cast.reason_growth, 1);
  assert.equal(cast.reason_value, 6);
  // The old rebuild ("new baseline + growth") gave 6 here, i.e. +20 XP more than the PC sheet.
  assert.equal(steppedExperienceCost(4, resolveCanonicalCurrent({ baseline: 4, current: cast.reason_base, growth: cast.reason_growth }), 10), 20);
});

test("an ability still on the old baseline, or at 0, follows the new baseline", () => {
  const onBaseline = { life_base: 3, life_growth: 0, life_gear: 0, life_manual: 0 };
  adjust(onBaseline, "life", 3, 5);
  assert.deepEqual([onBaseline.life_base, onBaseline.life_growth, onBaseline.life_value], [5, 0, 5]);
  const zero = { mundane_base: 0, mundane_growth: 0 };
  adjust(zero, "mundane", 4, 2);
  assert.deepEqual([zero.mundane_base, zero.mundane_growth], [2, 0]);
});

test("control values use the same rule and keep their own fields", () => {
  const cast = { passion_control_base: 8, passion_control_growth: 3, passion_control_gear: 2, passion_control_manual: 0 };
  adjust(cast, "passion_control", 5, 6);
  assert.equal(cast.passion_control_base, 8);
  assert.equal(cast.passion_control_growth, 2);
  assert.equal(cast.passion_control, 10);
});

test("every old/current/new combination matches the PC resolver and growth never goes negative", () => {
  for (let oldBase = 0; oldBase <= 6; oldBase++)
    for (let current = 0; current <= 9; current++)
      for (let nextBase = 0; nextBase <= 6; nextBase++) {
        const cast = { reason_base: current, reason_gear: 0, reason_manual: 0 };
        adjust(cast, "reason", oldBase, nextBase);
        assert.equal(cast.reason_base, resolveStyleBaselineValue(current, oldBase, nextBase));
        assert.ok(cast.reason_growth >= 0);
        assert.equal(cast.reason_value, cast.reason_base);
      }
});

test("the mobile style editor imports the shared PC resolver", () => {
  assertVersionedMatch(source, /import \{ resolveStyleBaselineValue \} from "\.\/sheet-baseline-adjustment\.js\?v=VERSION";/);
  assert.doesNotMatch(source, /character\[baseField\] = num\(nextBaseline\) \+ growth/);
});

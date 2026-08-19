import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const legacy = await readFile(new URL("../js/sheet-import-outfit-compat.js", import.meta.url), "utf8");
const tsv = await readFile(new URL("../js/outfit-ofc-tsv.js", import.meta.url), "utf8");
const master = await readFile(new URL("../js/outfit-ofc-master-apply.js", import.meta.url), "utf8");

test("legacy outfit import keeps concealment value and modifier separated", () => {
  assert.match(legacy, /concealment:concealA/);
  assert.match(legacy, /ofc\("concealment_penalty",first\(data,"concealB","concealmentPenalty","concealment_penalty"\)\)/);
  assert.doesNotMatch(legacy, /concealment:\[concealA,concealB\]/);
});

test("legacy outfit import preserves current control and CS semantics", () => {
  assert.match(legacy, /\["armor","vehicle"\]\.includes\(item\.category\)\?first\(data,"control","controlModifier"\):0/);
  assert.match(legacy, /\["tron","vehicle"\]\.includes\(item\.category\)\?first\(data,"cs","csModifier"\):0/);
  assert.match(legacy, /ofc\("electronic_control"/);
});

test("OFC TSV uses CS modifier instead of deprecated cs_value", () => {
  assert.match(tsv, /"cs_modifier", "crew", "sf"/);
  assert.match(tsv, /cs_modifier: raw\.CS/);
  assert.match(tsv, /if \(!details\.cs_modifier && row\.cs_value\) details\.cs_modifier = row\.cs_value/);
});

test("OFC TSV routes structured control and CS fields to base columns", () => {
  assert.match(tsv, /field === "control_value".*data-o="control_modifier"/s);
  assert.match(tsv, /field === "cs_modifier".*data-o="cs_modifier"/s);
  assert.match(tsv, /field === "concealment".*data-pc-outfit-proxy="concealment"/s);
});

test("direct OFC master transfer restores canonical description", () => {
  assert.match(master, /field === "description".*data-o="description"/s);
  assert.match(master, /concealment_penalty: row\.concealment_penalty/);
  assert.match(master, /cs_modifier: raw\.CS/);
});

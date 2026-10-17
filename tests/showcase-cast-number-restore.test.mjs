import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCastNumber, formatCastNumber, castNumberFromSlot, findDuplicateCastNumber } from "../js/showcase-cast-number.js";
import { planShowcaseRestore, obfuscatePublicId } from "../js/showcase-restore-matching.js";
import { manualCastFieldsFromCanonical } from "../js/showcase-manual-sheet-import.js";
import { renderShowcase } from "../js/showcase-output-html.js";

test("CAST No falls back to the cast order and survives the published slot label", () => {
  assert.equal(normalizeCastNumber("０５"), "5");
  assert.equal(normalizeCastNumber("0"), "");
  assert.equal(normalizeCastNumber("7"), "");
  assert.equal(formatCastNumber("", 2), "03");
  assert.equal(formatCastNumber("6", 0), "06");
  assert.equal(castNumberFromSlot("CAST 06", 0), 6);
  assert.equal(castNumberFromSlot("", 1), 2);
  assert.equal(findDuplicateCastNumber(["", "1"]), 1);
  assert.equal(findDuplicateCastNumber(["3", "", ""]), 3);
  assert.equal(findDuplicateCastNumber(["3", "", "1"]), 0);
});

test("standalone output shows the chosen CAST No in the card and the navigation", () => {
  const character = { id: "m", character_name: "ワンズ", manual_styles: "カタナ◎", player_name: "", affiliation: "", age: "", gender: "", citizen_rank: "" };
  const html = renderShowcase({ title: "T", actName: "A", casts: [{ manual: true, source: "manual", character, quote: "共通", description: "", castNo: "4" }] }, "https://example.test/");
  assert.match(html, /<p class="cast-card__slot">CAST 04<\/p>/);
  assert.match(html, /<span>04<\/span>ワンズ/);
});

test("restore never assigns a participant to a manual card by position (act with manual / registered / manual)", () => {
  const participant = { characterId: "c-64", characterPublicId: "TNX-000064", castOrder: 1 };
  const casts = [
    { slot: "CAST 01", fullName: "茅ヶ崎 慧", serial: "ScanFailed" },
    { slot: "CAST 02", fullName: "“首輪つき” 稲守 杏", serial: obfuscatePublicId("TNX-000064") },
    { slot: "CAST 03", fullName: "“一振り” ワンズ", serial: "ScanFailed" }
  ];
  const plan = planShowcaseRestore(casts, [participant]);
  assert.equal(plan.length, 3);
  assert.deepEqual(plan.map(entry => entry.participant?.characterId ?? null), [null, "c-64", null]);
});

test("restore uses each participant once and keeps the old position fallback only for serial-less data", () => {
  const a = { characterId: "a", characterPublicId: "TNX-1", castOrder: 1 };
  const b = { characterId: "b", characterPublicId: "TNX-2", castOrder: 2 };
  const duplicated = planShowcaseRestore([{ serial: obfuscatePublicId("TNX-1") }, { serial: obfuscatePublicId("TNX-1") }], [a, b]);
  assert.deepEqual(duplicated.map(entry => entry.participant?.characterId ?? null), ["a", null]);
  const legacy = planShowcaseRestore([{ serial: "" }, { serial: obfuscatePublicId("TNX-1") }], [a, b]);
  assert.deepEqual(legacy.map(entry => entry.participant?.characterId ?? null), ["b", "a"]);
});

test("character sheet import maps canonical warehouse data onto manual cast fields", () => {
  const fields = manualCastFieldsFromCanonical({
    basic: { character_name: "ワンズ", handle: "一振り", player_name: "キカイ", affiliation: "フリーランス", citizen_rank: "B-" },
    personal: { age: "24", gender: "男" },
    styles: { style_1: "カタナ", style_1_mark: "◎", style_2: "カブト", style_2_mark: "●", style_3: "", style_3_mark: "" }
  });
  assert.deepEqual(fields, { name: "“一振り” ワンズ", styles: "カタナ◎ / カブト●", player: "キカイ", affiliation: "フリーランス", age: "24", gender: "男", rank: "B-" });
});

test("generator wires CAST No, sheet import and restore through the shared helpers", async () => {
  const { readFile } = await import("node:fs/promises");
  const generator = await readFile(new URL("../js/showcase-generator-v3.js", import.meta.url), "utf8");
  const restore = await readFile(new URL("../js/showcase-edit-restore.js", import.meta.url), "utf8");
  assert.match(generator, /data-field="cast-no"/);
  assert.match(generator, /data-action="sheet-import"/);
  assert.match(generator, /showcase-manual-sheet-import\.js\?v=1/);
  assert.match(restore, /planShowcaseRestore\(casts, participants\)/);
  assert.match(restore, /!findSelectedRow\(participant\.characterId\)/);
});

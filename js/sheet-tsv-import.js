const OUTFIT_TARGET_MAP = Object.freeze({
  weapons: "weapon",
  armours: "armor",
  vehicles: "vehicle",
  residences: "residence",
  outfits: "other",
  "武器": "weapon",
  "防具": "armor",
  "ヴィークル": "vehicle",
  "住居": "residence",
  "住宅": "residence",
  "装備": "other"
});

export function parseSheetTsv(text) {
  const normalized = String(text ?? "").replace(/\r/g, "").trim();
  if (!normalized) return [];
  const lines = normalized.split("\n").filter(Boolean).map(line => line.split("\t"));
  if (!lines.length) return [];
  const header = lines.shift().map(value => value.trim());
  return lines.map(row => Object.fromEntries(
    header.map((name, index) => [name, (row[index] || "").replace(/\\n/g, "\n")])
  ));
}

export function buildStyleSkillTsvRow(row = {}, {
  base = {},
  styleKindFromLabel = () => ""
} = {}) {
  const label = row["種別"] || "";
  const fallbackKind = /奥義/.test(label) ? "ultimate" : /秘技/.test(label) ? "secret" : "normal";
  return {
    ...base,
    name: row["名称"] || "",
    skill_kind: styleKindFromLabel(label) || fallbackKind,
    level: Number(row["レベル"] || 1),
    description: row["解説"] || ""
  };
}

export function buildOutfitTsvRow(row = {}, { base = {} } = {}) {
  return {
    ...base,
    category: OUTFIT_TARGET_MAP[row.target] || "other",
    name: row.name || "",
    purchase_value: row.purchase || "",
    experience_cost: Number(row.permanent || 0),
    concealment: [row.concealA, row.concealB].filter(Boolean).join("/"),
    attack: row.attack || "",
    range: row.range || "",
    slot: row.part || row.slot || "",
    description: row.notes || ""
  };
}

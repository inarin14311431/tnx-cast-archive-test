export const LABELS = {
  weapon: "武器",
  armor: "防具",
  cyberware: "サイバーウェア",
  tron: "トロン",
  vehicle: "ヴィークル",
  residence: "住居",
  other: "その他"
};

export const RANGE_OPTIONS = [
  "", "なし", "至近", "至近※", "近", "中", "遠", "超遠", "武器", "解説参照", "―"
];

export const SLOT_OPTIONS = [
  "", "片手持ち", "両手持ち", "籠手", "靴", "指", "片腕", "両腕", "片脚", "両脚",
  "頭部", "眼部", "口腔", "頭髪", "皮膚", "骨格", "筋肉", "IANUS", "大脳", "小脳",
  "表層意識", "深層意識", "無意識", "タップ", "電脳", "操縦", "ヴィークル", "アンダーウェア",
  "スーツ", "コート", "アーマー", "ヘルメット", "マスク", "ゴーグル", "全身", "義体",
  "住宅", "住宅施設", "護符", "独立", "任意", "解説参照", "―"
];

export const CONTROL_OPTIONS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

export function normalizeNumber(value) {
  const result = Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

export function blankOutfit() {
  return {
    _new: true,
    id: `outfit-${crypto.randomUUID()}`,
    category: "",
    name: "",
    purchase_value: "",
    experience_cost: 0,
    concealment: "",
    attack: "",
    defense: "",
    range: "",
    slot: "",
    description: "",
    control_modifier: 0,
    cs_modifier: 0,
    mundane_modifier: 0,
    sort_order: 9999,
    _concealValue: "",
    _concealMod: "",
    _defS: "",
    _defP: "",
    _defI: ""
  };
}

export function parseConcealment(item) {
  if (item._concealParsed) return item;
  const text = String(item.concealment || "").trim();
  const match = text.match(/^\s*([^/（）()]+?)\s*(?:[／/]\s*([+-]?\d+)|[（(]\s*([+-]?\d+)\s*[）)])?\s*$/);
  item._concealValue = match ? String(match[1] || "").trim() : text;
  item._concealMod = match ? String(match[2] || match[3] || "").trim() : "";
  item._concealParsed = true;
  return item;
}

export function composeConcealment(item) {
  return [
    String(item._concealValue ?? "").trim(),
    String(item._concealMod ?? "").trim()
  ].filter(Boolean).join("/");
}

export function parseDefense(item) {
  if (item._defParsed) return item;
  const text = String(item.defense || "").trim();
  let match = text.match(/S\s*([+-]?\d+)\s*[\/／, ]+P\s*([+-]?\d+)\s*[\/／, ]+I\s*([+-]?\d+)/i);
  if (!match) match = text.match(/^\s*([+-]?\d+)\s*[\/／,]\s*([+-]?\d+)\s*[\/／,]\s*([+-]?\d+)\s*$/);
  item._defS = match ? match[1] : "";
  item._defP = match ? match[2] : "";
  item._defI = match ? match[3] : "";
  item._defParsed = true;
  return item;
}

export function composeDefense(item) {
  const s = String(item._defS ?? "").trim();
  const p = String(item._defP ?? "").trim();
  const i = String(item._defI ?? "").trim();
  return !s && !p && !i ? "" : `S ${s || 0} / P ${p || 0} / I ${i || 0}`;
}

export function cloneOutfit(item) {
  const draft = { ...item };
  parseConcealment(draft);
  parseDefense(draft);
  return draft;
}

export function collectOutfitRecord(item, character) {
  return {
    character_id: character?.id,
    category: item.category || "other",
    name: item.name || "",
    purchase_value: String(item.purchase_value ?? ""),
    experience_cost: normalizeNumber(item.experience_cost),
    concealment: composeConcealment(item),
    attack: item.attack || "",
    defense: composeDefense(item),
    range: item.range || "",
    slot: item.slot || "",
    description: item.description || "",
    control_modifier: normalizeNumber(item.control_modifier),
    cs_modifier: normalizeNumber(item.cs_modifier),
    mundane_modifier: normalizeNumber(item.mundane_modifier),
    sort_order: normalizeNumber(item.sort_order)
  };
}

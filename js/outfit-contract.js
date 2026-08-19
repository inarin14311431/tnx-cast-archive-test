export const OUTFIT_CATEGORIES = Object.freeze([
  "weapon", "armor", "cyberware", "tron", "vehicle", "residence", "other"
]);

export const OUTFIT_LABELS = Object.freeze({
  weapon: "武器",
  armor: "防具",
  cyberware: "サイバーウェア",
  tron: "トロン",
  vehicle: "ヴィークル",
  residence: "住居",
  other: "その他"
});

export const OUTFIT_BASE_FIELDS = Object.freeze([
  "name", "purchase_value", "experience_cost", "concealment", "concealment_penalty", "slot"
]);

export const OUTFIT_DESCRIPTION_FIELDS = Object.freeze([
  "description", "page_number"
]);

export const OUTFIT_PERFORMANCE_FIELDS = Object.freeze({
  weapon: ["attack", "parry", "range", "speed", "electronic_control"],
  armor: ["defense_s", "defense_p", "defense_i", "control_modifier", "electronic_control"],
  cyberware: ["electronic_control", "ianus_surface", "ianus_deep", "ianus_none"],
  tron: ["electronic_control", "speed", "tron_software", "tron_support", "tron_hardware", "cs_modifier"],
  vehicle: ["attack", "speed", "control_modifier", "cs_modifier", "electronic_control", "defense_s", "defense_p", "defense_i", "crew", "sf"],
  residence: ["speed", "electronic_control", "residence_entry", "residence_electric", "residence_area"],
  other: ["electronic_control"]
});

const CONTROL_CATEGORIES = new Set(["armor", "vehicle"]);
const CS_CATEGORIES = new Set(["tron", "vehicle"]);

export function normalizeOutfitCategory(value) {
  const category = String(value || "other").trim() || "other";
  return OUTFIT_CATEGORIES.includes(category) ? category : "other";
}

export function outfitSupportsControl(category) {
  return CONTROL_CATEGORIES.has(normalizeOutfitCategory(category));
}

export function outfitSupportsCsModifier(category) {
  return CS_CATEGORIES.has(normalizeOutfitCategory(category));
}

export function outfitPerformanceFields(category) {
  return OUTFIT_PERFORMANCE_FIELDS[normalizeOutfitCategory(category)] || OUTFIT_PERFORMANCE_FIELDS.other;
}

// Compatibility policy: legacy detail aliases may be read, but current editors must not create them.
export const OUTFIT_LEGACY_READ_ONLY_DETAIL_FIELDS = Object.freeze([
  "control_value", "cs_value"
]);

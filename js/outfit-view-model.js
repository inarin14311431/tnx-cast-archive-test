const CONTROL_CATEGORIES = new Set(["armor", "vehicle"]);
const CS_CATEGORIES = new Set(["tron", "vehicle"]);

export function normalizeOutfitForView(outfit = {}) {
  const category = String(outfit.category || "other").trim() || "other";
  const details = normalizeDetails(outfit.ofc_details);
  const concealment = splitLegacyConcealment(first(details.concealment, outfit.concealment));
  const defense = parseDefense(outfit.defense);
  const control = CONTROL_CATEGORIES.has(category) ? first(outfit.control_modifier) : "";
  const cs = CS_CATEGORIES.has(category) ? first(outfit.cs_modifier) : "";

  return {
    ...outfit,
    category,
    ofc_details: details,
    concealment: concealment.value,
    concealment_penalty: first(details.concealment_penalty, concealment.modifier),
    attack: first(outfit.attack, details.attack),
    parry: first(details.parry),
    range: first(outfit.range, details.range_text),
    speed: first(details.speed),
    electronic_control: first(details.electronic_control, outfit.electronic_control),
    control_modifier: control,
    cs_modifier: cs,
    defense_s: first(details.defense_s, defense.s),
    defense_p: first(details.defense_p, defense.p),
    defense_i: first(details.defense_i, defense.i),
    tron_software: first(details.tron_software),
    tron_support: first(details.tron_support),
    tron_hardware: first(details.tron_hardware),
    crew: first(details.crew),
    sf: first(details.sf),
    ianus_surface: first(details.ianus_surface),
    ianus_deep: first(details.ianus_deep),
    ianus_none: first(details.ianus_none),
    residence_entry: first(details.residence_entry),
    residence_electric: first(details.residence_electric),
    residence_area: first(details.residence_area),
    page_number: first(details.page_number)
  };
}

export function normalizeOutfitListForView(outfits) {
  return Array.isArray(outfits) ? outfits.map(normalizeOutfitForView) : [];
}

export function formatPurchasePair(outfit) {
  const normalized = normalizeOutfitForView(outfit);
  const details = normalized.ofc_details;
  return pair(first(details.purchase_target, normalized.purchase_value), first(details.permanent_cost, normalized.experience_cost));
}

export function formatConcealmentPair(outfit) {
  const normalized = normalizeOutfitForView(outfit);
  return pair(normalized.concealment, normalized.concealment_penalty);
}

export function splitLegacyConcealment(value) {
  const text = String(value ?? "").trim();
  if (!text) return { value: "", modifier: "" };
  const match = text.match(/^\s*([^/（）()]+?)\s*(?:[／/]\s*([^/（）()]+)|[（(]\s*([^）)]+)\s*[）)])?\s*$/);
  return match
    ? { value: String(match[1] || "").trim(), modifier: String(match[2] || match[3] || "").trim() }
    : { value: text, modifier: "" };
}

function normalizeDetails(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item ?? "")]))
    : {};
}

function parseDefense(value) {
  const result = { s: "", p: "", i: "" };
  const text = String(value ?? "").trim();
  if (!text) return result;
  for (const match of text.matchAll(/(?:^|[\s,，/／])([SPI])\s*[:：]?\s*([^/／,，\s]+)/gi)) {
    result[match[1].toLowerCase()] = match[2];
  }
  if (Object.values(result).some(Boolean)) return result;
  const parts = text.split(/[\/／,，\s]+/).filter(Boolean);
  result.s = parts[0] || "";
  result.p = parts[1] || "";
  result.i = parts[2] || "";
  return result;
}

function first(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function pair(left, right) {
  const a = first(left);
  const b = first(right);
  if (!a && !b) return "—";
  return `${a || "—"}/${b || "—"}`;
}

import { supabase } from "./supabase-client.js";

const BASE_SAVE_RPC = "save_character_bundle";
const OFC_SAVE_RPC = "save_character_bundle_with_ofc";
const ROOT_SELECTOR = "#outfit-list";

install();

function install() {
  if (supabase.__tnxOfcSaveWrapped) return;
  const originalRpc = supabase.rpc.bind(supabase);
  Object.defineProperty(supabase, "__tnxOfcSaveWrapped", { value: true });

  supabase.rpc = (functionName, args = {}, options) => {
    if (functionName !== BASE_SAVE_RPC) return originalRpc(functionName, args, options);
    return originalRpc(OFC_SAVE_RPC, {
      ...args,
      p_outfits: enrichOutfitPayload(Array.isArray(args?.p_outfits) ? args.p_outfits : [])
    }, options);
  };
}

function enrichOutfitPayload(items) {
  const rows = getOutfitRows();
  const queues = rowsBySignature(rows);
  const used = new Set();

  return items.map((item, index) => {
    const signature = outfitSignature(item.category, item.name);
    const queue = queues.get(signature) || [];
    let row = queue.find(candidate => !used.has(candidate));
    if (!row) row = rows.find(candidate => !used.has(candidate));
    if (row) used.add(row);

    return {
      ...item,
      sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index,
      ofc_details: row ? collectDetails(row) : compactDetails(item.ofc_details || {})
    };
  });
}

function collectDetails(row) {
  const details = {};
  row.querySelectorAll("[data-ofc]").forEach(input => {
    details[input.dataset.ofc] = String(input.value ?? "");
  });

  const category = valueOf(row, "category") || row.closest("table")?.dataset.outfitSchema || "other";
  const concealParts = String(valueOf(row, "concealment") || "").split(/[\/／]/);
  const armorDefense = parseDefense(valueOf(row, "defense"));

  const defense = {
    defense_s: row.querySelector('[data-armor-defense="S"],[data-armor-defense="s"]')?.value || details.defense_s || armorDefense.defense_s,
    defense_p: row.querySelector('[data-armor-defense="P"],[data-armor-defense="p"]')?.value || details.defense_p || armorDefense.defense_p,
    defense_i: row.querySelector('[data-armor-defense="I"],[data-armor-defense="i"]')?.value || details.defense_i || armorDefense.defense_i
  };

  return compactDetails({
    ...details,
    site_category: category,
    purchase_target: valueOf(row, "purchase_value"),
    permanent_cost: valueOf(row, "experience_cost"),
    concealment: concealParts[0] || "",
    concealment_penalty: details.concealment_penalty || concealParts[1] || "",
    attack: valueOf(row, "attack"),
    range_text: valueOf(row, "range"),
    slot: valueOf(row, "slot"),
    description: valueOf(row, "description"),
    ...defense
  });
}

function getOutfitRows() {
  return [...document.querySelectorAll(`${ROOT_SELECTOR} .outfit-table-row[data-outfit-key],${ROOT_SELECTOR} .outfit-card[data-outfit-key]`)]
    .filter((row, index, array) => array.findIndex(other => other.dataset.outfitKey === row.dataset.outfitKey) === index);
}

function rowsBySignature(rows) {
  const queues = new Map();
  for (const row of rows) {
    const signature = rowSignature(row);
    if (!queues.has(signature)) queues.set(signature, []);
    queues.get(signature).push(row);
  }
  return queues;
}

function rowSignature(row) {
  return outfitSignature(
    valueOf(row, "category") || row.closest("table")?.dataset.outfitSchema || "other",
    valueOf(row, "name")
  );
}

function outfitSignature(category, name) {
  return `${String(category || "other").trim()}\u0000${String(name || "").trim()}`;
}

function valueOf(row, field) {
  return row?.querySelector(`[data-o="${cssEscape(field)}"]`)?.value ?? "";
}

function parseDefense(value) {
  const text = String(value || "").trim();
  const output = { defense_s: "", defense_p: "", defense_i: "" };
  for (const match of text.matchAll(/\b([SPI])\s*[:：]?\s*([^/／,，\s]+)/gi)) {
    output[`defense_${match[1].toLowerCase()}`] = match[2];
  }
  if (Object.values(output).some(Boolean)) return output;
  const parts = text.split(/[\/／,，\s]+/).filter(Boolean);
  output.defense_s = parts[0] || "";
  output.defense_i = parts[1] || "";
  output.defense_p = parts[2] || "";
  return output;
}

function compactDetails(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(
    Object.entries(source)
      .map(([key, item]) => [key, String(item ?? "")])
      .filter(([, item]) => item !== "")
  );
}

function cssEscape(value) {
  return window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/(["\\])/g, "\\$1");
}

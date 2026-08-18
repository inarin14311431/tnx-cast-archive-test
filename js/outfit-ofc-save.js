import "./outfit-pc-field-policy.js?v=3";
import { supabase } from "./supabase-client.js";
import {
  getOutfitRows,
  outfitSignature,
  parseDefense,
  rowSignature,
  valueOf
} from "./outfit-ofc-utils.js";

const BASE_SAVE_RPC = "save_character_bundle";
const OFC_SAVE_RPC = "save_character_bundle_with_ofc";

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

function composeDefense(details, fallback = "") {
  const s = String(details.defense_s ?? "").trim();
  const p = String(details.defense_p ?? "").trim();
  const i = String(details.defense_i ?? "").trim();
  if (!s && !p && !i) return fallback || "";
  return `S ${s || 0} / P ${p || 0} / I ${i || 0}`;
}

function proxyValue(row, field, fallback) {
  const proxy = row.querySelector(`[data-pc-outfit-proxy="${field}"]`);
  if (!proxy) return fallback;
  if (proxy.dataset.pcOutfitTouched === "1" || String(proxy.value).trim() !== "") return String(proxy.value);
  return fallback;
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

    if (!row) {
      return {
        ...item,
        sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index,
        ofc_details: compactDetails(item.ofc_details || {})
      };
    }

    const details = collectDetails(row);
    const category = valueOf(row, "category") || item.category || "other";
    const electronicControl = String(details.electronic_control || item.electronic_control || "");
    const controlModifier = category === "armor" || category === "vehicle"
      ? Number(valueOf(row, "control_modifier") || item.control_modifier || 0)
      : Number(item.control_modifier || 0);
    const csModifier = category === "tron" || category === "vehicle"
      ? Number(valueOf(row, "cs_modifier") || item.cs_modifier || 0)
      : Number(item.cs_modifier || 0);

    if (category === "armor" || category === "vehicle") details.control_value = String(controlModifier);
    if (details.cs_value === "") delete details.cs_value;

    return {
      ...item,
      category,
      concealment: proxyValue(row, "concealment", item.concealment || ""),
      slot: proxyValue(row, "slot", item.slot || ""),
      electronic_control: electronicControl,
      defense: category === "vehicle" ? composeDefense(details, item.defense) : item.defense || "",
      control_modifier: controlModifier,
      cs_modifier: csModifier,
      sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index,
      ofc_details: compactDetails(details)
    };
  });
}

function collectDetails(row) {
  const details = {};
  row.querySelectorAll("[data-ofc]").forEach(input => {
    details[input.dataset.ofc] = String(input.value ?? "");
  });

  const category = valueOf(row, "category") || row.closest("table")?.dataset.outfitSchema || "other";
  const concealmentValue = proxyValue(row, "concealment", valueOf(row, "concealment") || "");
  const concealParts = String(concealmentValue || "").split(/[\/／]/);
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
    slot: proxyValue(row, "slot", valueOf(row, "slot") || ""),
    description: valueOf(row, "description"),
    ...defense
  });
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

function compactDetails(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(
    Object.entries(source)
      .map(([key, item]) => [key, String(item ?? "")])
      .filter(([, item]) => item !== "")
  );
}

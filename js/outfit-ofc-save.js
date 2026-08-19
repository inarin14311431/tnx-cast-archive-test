import "./outfit-pc-field-policy.js?v=5";
import { supabase } from "./supabase-client.js";
import { normalizeImportedOutfitDetails } from "./outfit-ofc-adapter.js?v=2";
import {
  getOutfitRows,
  outfitSignature,
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
      const category = item.category || "other";
      return {
        ...item,
        defense: category === "armor" ? "" : item.defense || "",
        mundane_modifier: undefined,
        sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index,
        ofc_details: normalizeImportedOutfitDetails(category, item.ofc_details || {})
      };
    }

    const details = collectDetails(row);
    const category = valueOf(row, "category") || item.category || "other";
    const electronicControl = String(details.electronic_control || item.electronic_control || "");
    const controlModifier = category === "armor" || category === "vehicle"
      ? Number(valueOf(row, "control_modifier") || item.control_modifier || 0)
      : 0;
    const csModifier = category === "tron" || category === "vehicle"
      ? Number(valueOf(row, "cs_modifier") || item.cs_modifier || 0)
      : 0;

    const payload = {
      ...item,
      category,
      concealment: String(valueOf(row, "concealment") || ""),
      slot: proxyValue(row, "slot", item.slot || ""),
      electronic_control: electronicControl,
      // Armor S/P/I persist canonically in ofc_details. The combined base defense
      // remains vehicle-read compatibility only until that DB column is retired.
      defense: category === "vehicle" ? composeDefense(details, item.defense) : "",
      control_modifier: controlModifier,
      cs_modifier: csModifier,
      sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index,
      ofc_details: normalizeImportedOutfitDetails(category, details)
    };
    delete payload.mundane_modifier;
    return payload;
  });
}

function collectDetails(row) {
  const details = { ...(globalThis.TNXOutfitOFCState?.getDetails?.(row) || {}) };
  row.querySelectorAll("[data-ofc]").forEach(input => {
    details[input.dataset.ofc] = String(input.value ?? "");
  });

  const category = valueOf(row, "category") || row.closest("table")?.dataset.outfitSchema || "other";
  const concealmentValue = String(valueOf(row, "concealment") || "");
  const defense = {
    defense_s: row.querySelector('[data-ofc="defense_s"]')?.value || details.defense_s || "",
    defense_p: row.querySelector('[data-ofc="defense_p"]')?.value || details.defense_p || "",
    defense_i: row.querySelector('[data-ofc="defense_i"]')?.value || details.defense_i || ""
  };

  return normalizeImportedOutfitDetails(category, {
    ...details,
    site_category: category,
    purchase_target: valueOf(row, "purchase_value"),
    permanent_cost: valueOf(row, "experience_cost"),
    concealment: concealmentValue,
    concealment_penalty: details.concealment_penalty || "",
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

import { supabase } from "./supabase-client.js";

const ROOT = "#outfit-list";

const HIDDEN_BASE_FIELDS = {
  cyberware: ["control_modifier", "cs_modifier", "mundane_modifier"],
  tron: ["control_modifier", "mundane_modifier"],
  vehicle: ["defense"],
  residence: ["mundane_modifier"],
  other: ["control_modifier", "cs_modifier", "mundane_modifier"]
};

const HIDDEN_OFC_FIELDS = new Set(["major_category", "minor_category", "control_value", "cs_value"]);
const EXTRA_BASE_FIELDS = {
  vehicle: [["concealment", "隠匿"], ["slot", "部位"]],
  residence: [["concealment", "隠匿"]]
};
const EXTRA_OFC_FIELDS = {
  tron: [["speed", "ス"]],
  residence: [["speed", "ス"]]
};

let queued = false;
let storedQueues = new Map();

const signature = (category, name) => `${String(category || "other").trim()}\u0000${String(name || "").trim()}`;

function hideElement(element) {
  if (!element) return;
  element.hidden = true;
  element.style.display = "none";
  element.setAttribute("aria-hidden", "true");
}

function hideBaseField(table, field) {
  hideElement(table.querySelector(`thead .outfit-table-head--${CSS.escape(field)}`));
  table.querySelectorAll(`tbody .outfit-table-cell--${CSS.escape(field)}`).forEach(hideElement);
}

function hideOfcField(table, field) {
  hideElement(table.querySelector(`[data-ofc-head="${CSS.escape(field)}"]`));
  table.querySelectorAll(`[data-ofc-cell="${CSS.escape(field)}"]`).forEach(hideElement);
}

function addHeader(table, field, label, kind) {
  const header = table.querySelector("thead tr");
  if (!header) return;
  if (kind === "base" && header.querySelector(`[data-pc-outfit-head="${CSS.escape(field)}"]`)) return;
  if (kind === "ofc" && header.querySelector(`[data-ofc-head="${CSS.escape(field)}"]`)) return;
  const th = document.createElement("th");
  th.className = `outfit-table-head ${kind === "ofc" ? "outfit-table-head--ofc " : ""}outfit-table-head--${field}`;
  th.textContent = label;
  if (kind === "base") th.dataset.pcOutfitHead = field;
  else th.dataset.ofcHead = field;
  const anchor = header.querySelector(".outfit-table-head--description") || header.querySelector(".outfit-table-head--actions");
  header.insertBefore(th, anchor || null);
}

function storedRecord(row) {
  const category = row.closest("table")?.dataset.outfitSchema || "other";
  const name = row.querySelector('[data-o="name"]')?.value || "";
  const queue = storedQueues.get(signature(category, name));
  return queue?.[Number(row.dataset.pcPolicyOccurrence || 0)] || null;
}

function storedValue(row, field, kind) {
  const item = storedRecord(row);
  if (!item) return "";
  if (kind === "ofc") return item.ofc_details?.[field] ?? "";
  return item[field] ?? "";
}

function addCell(row, field, label, kind) {
  if (kind === "base" && row.querySelector(`[data-pc-outfit-proxy="${CSS.escape(field)}"]`)) return;
  if (kind === "ofc" && row.querySelector(`[data-ofc="${CSS.escape(field)}"]`)) return;
  const td = document.createElement("td");
  td.className = `outfit-table-cell ${kind === "ofc" ? "outfit-table-cell--ofc " : ""}outfit-table-cell--${field}`;
  if (kind === "ofc") td.dataset.ofcCell = field;
  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.setAttribute("aria-label", label);
  if (kind === "base") {
    input.dataset.o = field;
    input.dataset.pcOutfitProxy = field;
  } else {
    input.dataset.ofc = field;
  }
  input.value = String(storedValue(row, field, kind) ?? "");
  td.append(input);
  const anchor = row.querySelector(".outfit-table-cell--description") || row.querySelector(".outfit-table-cell--actions");
  row.insertBefore(td, anchor || null);
}

function applyTable(table) {
  const category = table.dataset.outfitSchema || "other";
  const occurrence = new Map();
  table.querySelectorAll("tbody .outfit-table-row").forEach(row => {
    const name = row.querySelector('[data-o="name"]')?.value || "";
    const key = signature(category, name);
    const index = occurrence.get(key) || 0;
    row.dataset.pcPolicyOccurrence = String(index);
    occurrence.set(key, index + 1);
  });

  for (const field of HIDDEN_BASE_FIELDS[category] || []) hideBaseField(table, field);
  for (const field of HIDDEN_OFC_FIELDS) hideOfcField(table, field);
  if (category === "vehicle") hideOfcField(table, "parry");

  for (const [field, label] of EXTRA_BASE_FIELDS[category] || []) {
    addHeader(table, field, label, "base");
    table.querySelectorAll("tbody .outfit-table-row").forEach(row => addCell(row, field, label, "base"));
  }
  for (const [field, label] of EXTRA_OFC_FIELDS[category] || []) {
    addHeader(table, field, label, "ofc");
    table.querySelectorAll("tbody .outfit-table-row").forEach(row => addCell(row, field, label, "ofc"));
  }
}

function applyPolicy() {
  document.querySelectorAll(`${ROOT} table[data-outfit-schema]`).forEach(applyTable);
}

function queue() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; applyPolicy(); });
}

function redirectCanonicalFields(event) {
  const input = event.target.closest?.("[data-ofc]");
  if (!input) return;
  const row = input.closest(".outfit-table-row");
  const category = row?.closest("table")?.dataset.outfitSchema || "other";
  if (!row) return;

  if (input.dataset.ofc === "control_value" && (category === "armor" || category === "vehicle")) {
    const base = row.querySelector('[data-o="control_modifier"]');
    if (base && (!String(base.value).trim() || Number(base.value) === 0) && String(input.value).trim()) {
      base.value = input.value;
      base.dispatchEvent(new Event("input", { bubbles: true }));
      base.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  if (input.dataset.ofc === "cs_value" && (category === "tron" || category === "vehicle")) {
    const base = row.querySelector('[data-o="cs_modifier"]');
    if (base && (!String(base.value).trim() || Number(base.value) === 0) && String(input.value).trim()) {
      base.value = input.value;
      base.dispatchEvent(new Event("input", { bubbles: true }));
      base.dispatchEvent(new Event("change", { bubbles: true }));
    }
    input.value = "";
  }
}

async function loadStoredRows() {
  const publicId = new URLSearchParams(location.search).get("id")?.trim();
  if (!publicId) return;
  const characterResult = await supabase.from("characters").select("id").eq("public_id", publicId).maybeSingle();
  if (characterResult.error || !characterResult.data?.id) return;
  const result = await supabase.from("character_outfits")
    .select("category,name,concealment,slot,sort_order,ofc_details")
    .eq("character_id", characterResult.data.id)
    .order("sort_order");
  if (result.error) return;
  const queues = new Map();
  for (const item of result.data || []) {
    const key = signature(item.category, item.name);
    if (!queues.has(key)) queues.set(key, []);
    queues.get(key).push(item);
  }
  storedQueues = queues;
}

async function init() {
  const root = document.querySelector(ROOT);
  if (!root) return;
  await loadStoredRows();
  document.addEventListener("input", redirectCanonicalFields, true);
  document.addEventListener("change", redirectCanonicalFields, true);
  new MutationObserver(queue).observe(root, { childList: true, subtree: true });
  queue();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();

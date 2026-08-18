import { supabase } from "./supabase-client.js";

const ROOT = "#outfit-list";
const EXTRA_BASE_FIELDS = {
  vehicle: [["concealment", "隠匿値"], ["slot", "部位"]],
  residence: [["concealment", "隠匿値"]]
};

let queued = false;
let storedQueues = new Map();

const signature = (category, name) => `${String(category || "other").trim()}\u0000${String(name || "").trim()}`;

function storedRecord(row) {
  const category = row.closest("table")?.dataset.outfitSchema || "other";
  const name = row.querySelector('[data-o="name"]')?.value || "";
  const queue = storedQueues.get(signature(category, name));
  return queue?.[Number(row.dataset.pcProxyOccurrence || 0)] || null;
}

function addHeader(table, field, label) {
  const header = table.querySelector("thead tr");
  if (!header || header.querySelector(`[data-pc-outfit-head="${CSS.escape(field)}"]`)) return;
  const th = document.createElement("th");
  th.className = `outfit-table-head outfit-table-head--${field}`;
  th.dataset.pcOutfitHead = field;
  th.textContent = label;
  const anchor = header.querySelector(".outfit-table-head--description") || header.querySelector(".outfit-table-head--actions");
  header.insertBefore(th, anchor || null);
}

function addCell(row, field, label) {
  if (row.querySelector(`[data-pc-outfit-proxy="${CSS.escape(field)}"]`) || row.querySelector(`[data-o="${CSS.escape(field)}"]`)) return;
  const item = storedRecord(row);
  const td = document.createElement("td");
  td.className = `outfit-table-cell outfit-table-cell--${field}`;
  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.dataset.o = field;
  input.dataset.pcOutfitProxy = field;
  input.setAttribute("aria-label", label);
  input.value = String(item?.[field] ?? "");
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
    row.dataset.pcProxyOccurrence = String(index);
    occurrence.set(key, index + 1);
  });

  for (const [field, label] of EXTRA_BASE_FIELDS[category] || []) {
    addHeader(table, field, label);
    table.querySelectorAll("tbody .outfit-table-row").forEach(row => addCell(row, field, label));
  }
}

function applyPolicy() {
  document.querySelectorAll(`${ROOT} table[data-outfit-schema]`).forEach(applyTable);
}

function queue() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    applyPolicy();
  });
}

async function loadStoredRows() {
  const publicId = new URLSearchParams(location.search).get("id")?.trim();
  if (!publicId) return;
  const characterResult = await supabase.from("characters").select("id").eq("public_id", publicId).maybeSingle();
  if (characterResult.error || !characterResult.data?.id) return;
  const result = await supabase.from("character_outfits")
    .select("category,name,concealment,slot,sort_order")
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
  new MutationObserver(queue).observe(root, { childList: true, subtree: true });
  queue();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();

import {
  getOutfitRows,
  rowSignature,
  valueOf
} from "./outfit-ofc-utils.js";

const ROOT_SELECTOR = "#outfit-list";
const stateByKey = new Map();
let restoreQueues = null;
let enhanceQueued = false;
let suppressDirty = false;

function parseEmbeddedDetails(row) {
  try {
    const value = JSON.parse(row?.dataset?.outfitOfcDetails || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

globalThis.TNXOutfitOFCState = {
  getDetails(row) {
    const key = row?.dataset?.outfitKey || "";
    const details = key ? stateByKey.get(key) : null;
    return details ? { ...details } : {};
  },
  setDetails(rowOrKey, details = {}) {
    const key = typeof rowOrKey === "string" ? rowOrKey : rowOrKey?.dataset?.outfitKey || "";
    if (!key) return false;
    stateByKey.set(key, normalizeDetails(details));
    queueEnhance();
    return true;
  }
};

globalThis.TNXOutfitOfcFields = {
  queueEnhance
};

initialize();

function initialize() {
  const root = document.querySelector(ROOT_SELECTOR);
  if (!root) return;

  new MutationObserver(queueEnhance).observe(root, { childList: true, subtree: true });
  document.addEventListener("input", handleDetailInput, true);
  document.addEventListener("change", handleDetailInput, true);
  document.addEventListener("click", handleOutfitMove, true);
  queueEnhance();
}

function queueEnhance() {
  if (enhanceQueued) return;
  enhanceQueued = true;
  requestAnimationFrame(() => {
    enhanceQueued = false;
    enhanceTables();
  });
}

function enhanceTables() {
  const root = document.querySelector(ROOT_SELECTOR);
  if (!root) return;
  suppressDirty = true;
  try {
    root.querySelectorAll("tbody .outfit-table-row[data-outfit-key]").forEach(row => {
      const details = ensureRowState(row, row.dataset.outfitKey || "");
      row.querySelectorAll("[data-ofc]").forEach(input => {
        const next = String(details[input.dataset.ofc] ?? input.value ?? "");
        if (input.value !== next) input.value = next;
      });
    });
  } finally {
    suppressDirty = false;
  }
}

function ensureRowState(row, key) {
  if (key && stateByKey.has(key)) return stateByKey.get(key);
  const signature = rowSignature(row);
  let details = shiftQueue(restoreQueues, signature) || parseEmbeddedDetails(row);
  details = normalizeDetails(details);
  row.querySelectorAll("[data-ofc]").forEach(input => {
    const value = String(input.value ?? "");
    if (value !== "" || !(input.dataset.ofc in details)) details[input.dataset.ofc] = value;
  });
  if (key) stateByKey.set(key, details);
  return details;
}

function shiftQueue(queues, signature) {
  if (!queues) return null;
  const queue = queues.get(signature);
  if (!queue?.length) return null;
  const value = queue.shift();
  if (!queue.length) queues.delete(signature);
  if (queues === restoreQueues && queues.size === 0) restoreQueues = null;
  return value;
}

function handleDetailInput(event) {
  const input = event.target.closest?.("[data-ofc]");
  if (!input) return;
  const row = input.closest("[data-outfit-key]");
  if (!row) return;
  const key = row.dataset.outfitKey || "";
  const details = ensureRowState(row, key);
  details[input.dataset.ofc] = input.value;
  if (key) stateByKey.set(key, details);
  if (!suppressDirty && event.type === "change") queueEnhance();
}

function handleOutfitMove(event) {
  if (!event.target.closest?.("[data-outfit-move]")) return;
  restoreQueues = snapshotDetailQueues();
  window.setTimeout(queueEnhance, 0);
  window.setTimeout(queueEnhance, 80);
}

function collectDetails(row) {
  const details = normalizeDetails(stateByKey.get(row.dataset.outfitKey) || parseEmbeddedDetails(row));
  row.querySelectorAll("[data-ofc]").forEach(input => {
    details[input.dataset.ofc] = input.value;
  });

  const category = valueOf(row, "category") || "other";
  const concealParts = String(valueOf(row, "concealment") || "").split(/[\/／]/);
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
    defense_s: row.querySelector('[data-ofc="defense_s"]')?.value || details.defense_s || "",
    defense_p: row.querySelector('[data-ofc="defense_p"]')?.value || details.defense_p || "",
    defense_i: row.querySelector('[data-ofc="defense_i"]')?.value || details.defense_i || ""
  });
}

function snapshotDetailQueues() {
  const queues = new Map();
  for (const row of getOutfitRows()) {
    const signature = rowSignature(row);
    if (!queues.has(signature)) queues.set(signature, []);
    queues.get(signature).push(collectDetails(row));
  }
  return queues;
}

function normalizeDetails(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(Object.entries(source).map(([key, item]) => [key, String(item ?? "")]));
}

function compactDetails(value) {
  const normalized = normalizeDetails(value);
  return Object.fromEntries(Object.entries(normalized).filter(([, item]) => item !== ""));
}

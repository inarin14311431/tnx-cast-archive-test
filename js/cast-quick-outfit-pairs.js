import { getOutfits } from "./cast-data-store.js";

const pages = document.querySelector("#quick-sheet-pages");
const button = document.querySelector("#cast-quick-sheet-button");

if (pages && button) initialize();

function initialize() {
  button.addEventListener("click", () => {
    requestAnimationFrame(() => requestAnimationFrame(apply));
  });
  new MutationObserver(() => {
    if (document.body.classList.contains("is-quick-sheet-open")) queueApply();
  }).observe(pages, { childList: true, subtree: true });
}

let queued = false;
function queueApply() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    void apply();
  });
}

async function apply() {
  const outfits = await getOutfits();
  const grouped = new Map();
  for (const outfit of outfits) {
    const category = outfit.category || "other";
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(outfit);
  }

  patchSection(pages.querySelector('[data-quick-sheet-section="weapons"]'), "weapon", grouped.get("weapon") || []);
  patchSection(pages.querySelector('[data-quick-sheet-section="armor"]'), "armor", grouped.get("armor") || []);
  pages.querySelectorAll("[data-quick-outfit-category]").forEach(section => {
    const category = section.dataset.quickOutfitCategory || "other";
    patchSection(section, category, grouped.get(category) || []);
  });
}

function patchSection(section, category, outfits) {
  const table = section?.querySelector(".quick-sheet__outfit-table");
  if (!table) return;
  ensureColumn(table, "purchase", "購入", 1);
  ensureColumn(table, "concealment", "隠匿", 2);

  if (category === "tron" || category === "vehicle") {
    const legacyHead = table.querySelector(".quick-sheet__outfit-cs-value");
    if (legacyHead) legacyHead.textContent = "CS修正";
  } else if (category === "other") {
    removeColumn(table, "cs-value");
  }

  [...table.tBodies[0]?.rows || []].forEach((row, index) => {
    const outfit = outfits[index];
    if (!outfit) return;
    setCell(row, "purchase", formatPurchase(outfit));
    setCell(row, "concealment", formatConcealment(outfit));
    if (category === "tron" || category === "vehicle") {
      const cs = row.querySelector(".quick-sheet__outfit-cs-value");
      if (cs) cs.textContent = display(outfit.cs_modifier);
    }
  });
}

function ensureColumn(table, key, label, index) {
  const className = `quick-sheet__outfit-${key}`;
  const headRow = table.tHead?.rows?.[0];
  if (!headRow) return;
  let head = headRow.querySelector(`.${className}`);
  if (!head) {
    head = document.createElement("th");
    head.className = `${className} quick-sheet__outfit-stat`;
    const anchor = headRow.cells[index] || null;
    headRow.insertBefore(head, anchor);
  }
  head.textContent = label;

  [...table.tBodies[0]?.rows || []].forEach(row => {
    if (row.querySelector(`.${className}`)) return;
    const cell = document.createElement("td");
    cell.className = `${className} quick-sheet__outfit-stat`;
    const anchor = row.cells[index] || null;
    row.insertBefore(cell, anchor);
  });
}

function removeColumn(table, suffix) {
  table.querySelectorAll(`.quick-sheet__outfit-${suffix}`).forEach(cell => cell.remove());
}

function setCell(row, key, value) {
  const cell = row.querySelector(`.quick-sheet__outfit-${key}`);
  if (cell) cell.textContent = value;
}

function detailsOf(outfit) {
  return outfit?.ofc_details && typeof outfit.ofc_details === "object" && !Array.isArray(outfit.ofc_details)
    ? outfit.ofc_details
    : {};
}

function formatPurchase(outfit) {
  const details = detailsOf(outfit);
  const purchase = first(details.purchase_target, outfit.purchase_value);
  const permanent = first(details.permanent_cost, outfit.experience_cost);
  return pair(purchase, permanent);
}

function formatConcealment(outfit) {
  const details = detailsOf(outfit);
  const parsed = splitLegacyConcealment(first(outfit.concealment, details.concealment));
  const value = first(details.concealment, parsed.value);
  const modifier = first(details.concealment_penalty, parsed.modifier);
  return pair(value, modifier);
}

function splitLegacyConcealment(value) {
  const text = String(value ?? "").trim();
  if (!text) return { value: "", modifier: "" };
  const match = text.match(/^\s*([^/（）()]+?)\s*(?:[／/]\s*([^/（）()]+)|[（(]\s*([^）)]+)\s*[）)])?\s*$/);
  return match
    ? { value: String(match[1] || "").trim(), modifier: String(match[2] || match[3] || "").trim() }
    : { value: text, modifier: "" };
}

function first(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text !== "") return text;
  }
  return "";
}

function pair(left, right) {
  const a = first(left);
  const b = first(right);
  if (!a && !b) return "—";
  return `${a || "—"}/${b || "—"}`;
}

function display(value) {
  const text = first(value);
  return text || "—";
}

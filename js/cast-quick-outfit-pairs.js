import { getOutfits } from "./cast-data-store.js";

const pages = document.querySelector("#quick-sheet-pages");
const button = document.querySelector("#cast-quick-sheet-button");

if (pages && button) initialize();

function initialize() {
  installLayoutStyles();
  button.addEventListener("click", () => {
    requestAnimationFrame(() => requestAnimationFrame(apply));
  });
  new MutationObserver(() => {
    if (document.body.classList.contains("is-quick-sheet-open")) queueApply();
  }).observe(pages, { childList: true, subtree: true });
}

function installLayoutStyles() {
  if (document.querySelector("#quick-outfit-pair-layout")) return;
  const style = document.createElement("style");
  style.id = "quick-outfit-pair-layout";
  style.textContent = `
    .quick-sheet__outfit-table{width:100%;table-layout:fixed}
    .quick-sheet__outfit-table .quick-sheet__outfit-name{width:20%;min-width:92px}
    .quick-sheet__outfit-table .quick-sheet__outfit-purchase,
    .quick-sheet__outfit-table .quick-sheet__outfit-concealment{width:7%;min-width:46px;white-space:nowrap}
    .quick-sheet__outfit-table .quick-sheet__outfit-attack,
    .quick-sheet__outfit-table .quick-sheet__outfit-parry,
    .quick-sheet__outfit-table .quick-sheet__outfit-range,
    .quick-sheet__outfit-table .quick-sheet__outfit-speed,
    .quick-sheet__outfit-table .quick-sheet__outfit-defense-s,
    .quick-sheet__outfit-table .quick-sheet__outfit-defense-p,
    .quick-sheet__outfit-table .quick-sheet__outfit-defense-i,
    .quick-sheet__outfit-table .quick-sheet__outfit-tron-software,
    .quick-sheet__outfit-table .quick-sheet__outfit-tron-support,
    .quick-sheet__outfit-table .quick-sheet__outfit-tron-hardware,
    .quick-sheet__outfit-table .quick-sheet__outfit-cs-value,
    .quick-sheet__outfit-table .quick-sheet__outfit-crew,
    .quick-sheet__outfit-table .quick-sheet__outfit-sf,
    .quick-sheet__outfit-table .quick-sheet__outfit-residence-entry,
    .quick-sheet__outfit-table .quick-sheet__outfit-residence-electric,
    .quick-sheet__outfit-table .quick-sheet__outfit-residence-area,
    .quick-sheet__outfit-table .quick-sheet__outfit-electronic-control{width:5.5%;min-width:34px;white-space:nowrap}
    .quick-sheet__outfit-table .quick-sheet__outfit-description{width:auto}
    .quick-sheet__outfit-table th.quick-sheet__outfit-stat,
    .quick-sheet__outfit-table td.quick-sheet__outfit-stat{padding-left:3px;padding-right:3px;text-align:center}
    .quick-sheet__outfit-table th.quick-sheet__outfit-purchase,
    .quick-sheet__outfit-table th.quick-sheet__outfit-concealment{letter-spacing:0}
    @media print{
      .quick-sheet__outfit-table .quick-sheet__outfit-purchase,
      .quick-sheet__outfit-table .quick-sheet__outfit-concealment{min-width:0}
    }
  `;
  document.head.append(style);
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

  // Keep the act-reference basics in the same position for every category.
  ensureColumn(table, "purchase", "購入", 1);
  ensureColumn(table, "concealment", "隠匿", 2);

  if (category === "tron" || category === "vehicle") {
    setText(table.querySelector(".quick-sheet__outfit-cs-value"), "CS修正");
  } else if (category === "other") {
    removeColumn(table, "cs-value");
  }

  [...table.tBodies[0]?.rows || []].forEach((row, index) => {
    const outfit = outfits[index];
    if (!outfit) return;
    setCell(row, "purchase", formatPurchase(outfit));
    setCell(row, "concealment", formatConcealment(outfit));
    if (category === "tron" || category === "vehicle") {
      setText(row.querySelector(".quick-sheet__outfit-cs-value"), display(outfit.cs_modifier));
    }
  });

  if (category === "armor") normalizeArmorFooter(table);
}

function ensureColumn(table, key, label, index) {
  const className = `quick-sheet__outfit-${key}`;
  const headRow = table.tHead?.rows?.[0];
  if (!headRow) return;
  let head = headRow.querySelector(`.${className}`);
  if (!head) {
    head = document.createElement("th");
    head.className = `${className} quick-sheet__outfit-stat`;
    headRow.insertBefore(head, headRow.cells[index] || null);
  }
  setText(head, label);

  [...table.tBodies[0]?.rows || []].forEach(row => {
    if (row.querySelector(`.${className}`)) return;
    const cell = document.createElement("td");
    cell.className = `${className} quick-sheet__outfit-stat`;
    row.insertBefore(cell, row.cells[index] || null);
  });
}

function normalizeArmorFooter(table) {
  const row = table.tFoot?.rows?.[0];
  if (!row) return;

  const totalLabel = row.querySelector(".quick-sheet__armor-total-label");
  const defenseCells = [...row.querySelectorAll(".quick-sheet__armor-total-value")];
  if (!totalLabel || defenseCells.length !== 3) return;

  // Name / Purchase / Concealment precede S/P/I after normalization.
  totalLabel.colSpan = 3;
  const totalColumns = table.tHead?.rows?.[0]?.cells?.length || 0;
  const remainder = Math.max(0, totalColumns - 6);
  const spacers = [...row.querySelectorAll(".quick-sheet__armor-total-spacer")];

  if (!remainder) {
    spacers.forEach(cell => cell.remove());
    return;
  }

  let spacer = spacers[0];
  if (!spacer) {
    spacer = document.createElement("td");
    spacer.className = "quick-sheet__armor-total-spacer";
    row.append(spacer);
  }
  spacer.colSpan = remainder;
  spacers.slice(1).forEach(cell => cell.remove());
}

function removeColumn(table, suffix) {
  table.querySelectorAll(`.quick-sheet__outfit-${suffix}`).forEach(cell => cell.remove());
}

function setCell(row, key, value) {
  setText(row.querySelector(`.quick-sheet__outfit-${key}`), value);
}

function setText(element, value) {
  if (!element) return;
  const text = String(value ?? "");
  if (element.textContent !== text) element.textContent = text;
}

function detailsOf(outfit) {
  return outfit?.ofc_details && typeof outfit.ofc_details === "object" && !Array.isArray(outfit.ofc_details)
    ? outfit.ofc_details
    : {};
}

function formatPurchase(outfit) {
  const details = detailsOf(outfit);
  return pair(first(details.purchase_target, outfit.purchase_value), first(details.permanent_cost, outfit.experience_cost));
}

function formatConcealment(outfit) {
  const details = detailsOf(outfit);
  const parsed = splitLegacyConcealment(first(outfit.concealment, details.concealment));
  return pair(first(details.concealment, parsed.value), first(details.concealment_penalty, parsed.modifier));
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
  return first(value) || "—";
}

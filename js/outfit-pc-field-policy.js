const ROOT = "#outfit-list";

const HIDDEN_BASE_FIELDS = {
  cyberware: ["control_modifier", "cs_modifier", "mundane_modifier"],
  tron: ["control_modifier", "mundane_modifier"],
  vehicle: ["defense"],
  residence: ["mundane_modifier"],
  other: ["control_modifier", "cs_modifier", "mundane_modifier"]
};

const HIDDEN_OFC_FIELDS = new Set([
  "major_category",
  "minor_category",
  "control_value",
  "cs_value"
]);

const EXTRA_BASE_FIELDS = {
  vehicle: [
    ["concealment", "隠匿"],
    ["slot", "部位"]
  ],
  residence: [
    ["concealment", "隠匿"]
  ]
};

const EXTRA_OFC_FIELDS = {
  tron: [["speed", "ス"]],
  residence: [["speed", "ス"]]
};

let queued = false;

function tableCategory(table) {
  return table?.dataset.outfitSchema || "other";
}

function hideBaseField(table, field) {
  table.querySelector(`thead .outfit-table-head--${CSS.escape(field)}`)?.remove();
  table.querySelectorAll(`tbody .outfit-table-cell--${CSS.escape(field)}`).forEach(cell => cell.remove());
}

function hideOfcField(table, field) {
  table.querySelector(`[data-ofc-head="${CSS.escape(field)}"]`)?.remove();
  table.querySelectorAll(`[data-ofc-cell="${CSS.escape(field)}"]`).forEach(cell => cell.remove());
}

function addHeader(table, field, label, kind) {
  const header = table.querySelector("thead tr");
  if (!header) return;
  if (kind === "base" && header.querySelector(`.outfit-table-head--${CSS.escape(field)}`)) return;
  if (kind === "ofc" && header.querySelector(`[data-ofc-head="${CSS.escape(field)}"]`)) return;
  const th = document.createElement("th");
  th.className = `outfit-table-head outfit-table-head--${kind === "ofc" ? "ofc " : ""}outfit-table-head--${field}`;
  th.textContent = label;
  if (kind === "ofc") th.dataset.ofcHead = field;
  const anchor = header.querySelector(".outfit-table-head--description") || header.querySelector(".outfit-table-head--actions");
  header.insertBefore(th, anchor || null);
}

function addCell(row, field, label, kind) {
  if (kind === "base" && row.querySelector(`[data-pc-outfit-proxy="${CSS.escape(field)}"]`)) return;
  if (kind === "ofc" && row.querySelector(`[data-ofc="${CSS.escape(field)}"]`)) return;
  const td = document.createElement("td");
  td.className = `outfit-table-cell outfit-table-cell--${kind === "ofc" ? "ofc " : ""}outfit-table-cell--${field}`;
  if (kind === "ofc") td.dataset.ofcCell = field;
  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.setAttribute("aria-label", label);
  if (kind === "base") {
    input.dataset.o = field;
    input.dataset.pcOutfitProxy = field;
    const detail = row.querySelector(`[data-ofc="${CSS.escape(field === "concealment" ? "concealment" : field)}"]`);
    input.value = detail?.value || "";
  } else {
    input.dataset.ofc = field;
  }
  td.append(input);
  const anchor = row.querySelector(".outfit-table-cell--description") || row.querySelector(".outfit-table-cell--actions");
  row.insertBefore(td, anchor || null);
}

function applyTable(table) {
  const category = tableCategory(table);
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
  requestAnimationFrame(() => {
    queued = false;
    applyPolicy();
  });
}

function init() {
  const root = document.querySelector(ROOT);
  if (!root) return;
  new MutationObserver(queue).observe(root, { childList: true, subtree: true });
  queue();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();

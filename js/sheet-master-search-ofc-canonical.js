import { supabase } from "./supabase-client.js";
import { masterRowToOutfitDetails } from "./outfit-ofc-adapter.js?v=2";

const ROOT = "#outfit-list";
const DIALOG = "#master-search-dialog";

function isOfcSearchOpen() {
  const dialog = document.querySelector(DIALOG);
  return Boolean(dialog?.open && String(dialog.querySelector("#master-search-title")?.textContent || "").includes("OFC"));
}

function outfitCards() {
  return [...document.querySelectorAll(`${ROOT} [data-outfit-key]`)];
}

function setControl(control, value) {
  if (!control) return;
  control.value = String(value ?? "");
  control.dispatchEvent(new Event("input", { bubbles: true }));
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

async function waitForAddedCards(before, expected, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const added = outfitCards().filter(card => !before.has(card.dataset.outfitKey));
    if (added.length >= expected) {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      return outfitCards().filter(card => !before.has(card.dataset.outfitKey));
    }
    await new Promise(resolve => setTimeout(resolve, 60));
  }
  return outfitCards().filter(card => !before.has(card.dataset.outfitKey));
}

function applyBaseAndModifierFields(card, masterRow, details) {
  const fields = {
    concealment: details.concealment ?? masterRow.concealment ?? "",
    attack: details.attack ?? masterRow.attack ?? "",
    range: details.range_text ?? masterRow.range_text ?? "",
    slot: details.slot ?? masterRow.slot ?? "",
    control_modifier: details.control_modifier ?? masterRow.control_value ?? "",
    cs_modifier: details.cs_modifier ?? "",
    description: details.description ?? masterRow.description ?? ""
  };
  for (const [field, value] of Object.entries(fields)) {
    const control = card.querySelector(`[data-o="${field}"]`);
    if (control) setControl(control, value);
  }
}

function applyCanonicalMaster(card, masterRow) {
  if (!card || !masterRow) return;
  const details = masterRowToOutfitDetails(masterRow);
  globalThis.TNXOutfitOFCState?.applyMasterRow?.(card, masterRow, { dispatch: true });
  applyBaseAndModifierFields(card, masterRow, details);

  // The visible electric-control field is both a model field and an OFC detail field.
  // Writing it explicitly guarantees that search insertion updates the editor model,
  // even if an older cached master-apply module is still present in the page.
  const electronicControl = card.querySelector('[data-ofc="electronic_control"]');
  if (electronicControl) setControl(electronicControl, details.electronic_control ?? "");
}

async function fetchRows(ids) {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("ofc_master").select("*").in("id", ids);
  if (error) throw error;
  const byId = new Map((data || []).map(row => [String(row.id), row]));
  return ids.map(id => byId.get(String(id))).filter(Boolean);
}

async function synchronize(ids, before) {
  try {
    const rows = await fetchRows(ids);
    if (!rows.length) return;
    const added = await waitForAddedCards(before, rows.length);
    rows.forEach((row, index) => applyCanonicalMaster(added[index], row));
  } catch (error) {
    console.error("OFC search canonical detail synchronization failed", error);
  }
}

document.addEventListener("click", event => {
  if (!isOfcSearchOpen()) return;
  const single = event.target.closest?.(`${DIALOG} [data-result-add]`);
  const bulk = event.target.closest?.(`${DIALOG} #master-search-add`);
  if (!single && !bulk) return;

  const ids = single
    ? [String(single.dataset.resultAdd || "")].filter(Boolean)
    : [...(globalThis.__tnxMasterSearchSelectedIds || [])].map(String).filter(Boolean);
  if (!ids.length) return;

  const before = new Set(outfitCards().map(card => card.dataset.outfitKey));
  setTimeout(() => void synchronize(ids, before), 0);
}, true);

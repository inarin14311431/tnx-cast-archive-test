import { APP_EVENTS, emitAppEvent } from "./app-events.js?v=1";

const composition = Object.freeze({
  page: "sheet.html",
  version: 1,
  owners: Object.freeze({
    "#style-grid": "sheet-style-editor",
    "#general-skills": "sheet-general-skill-editor",
    "#style-skills": "sheet-style-skill-editor",
    "#outfit-list": "sheet-outfit-editor",
    "#save-button": "sheet-save-coordinator",
    "#sheet-combo-dialog": "sheet-combo-editor"
  }),
  modules: Object.freeze([
    "sheet.js",
    "sheet-image.js",
    "sheet-personal-data.js",
    "sheet-skill-ui.js",
    "sheet-features.js",
    "sheet-multiline-fields.js",
    "experience.js",
    "style-skill-separators.js",
    "sheet-master-search.js",
    "sheet-master-search-access.js",
    "sheet-master-search-filters.js",
    "outfit-ofc-fields.js",
    "sheet-master-autofill.js",
    "sheet-combos.js",
    "sheet-snapshots.js"
  ])
});

function applyOwnershipContract() {
  for (const [selector, owner] of Object.entries(composition.owners)) {
    const node = document.querySelector(selector);
    if (node) node.dataset.runtimeOwner = owner;
  }
  emitAppEvent(document, APP_EVENTS.SHEET_COMPOSITION_READY, composition);
}

globalThis.TNX_SHEET_APP = composition;
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyOwnershipContract, { once: true });
else applyOwnershipContract();

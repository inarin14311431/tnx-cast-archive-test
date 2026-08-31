import { APP_EVENTS, emitAppEvent } from "./app-events.js?v=1";

const composition = Object.freeze({
  page: "cast.html",
  version: 1,
  owners: Object.freeze({
    "#cast-content": "cast-core",
    "#skills-container": "cast-skill-presentation",
    "#style-skill-panel": "cast-style-skill-presentation",
    "#outfit-container": "cast-outfit-presentation",
    "#quick-sheet-pages": "cast-quick-sheet",
    "#mobile-cast-view": "cast-mobile-presentation"
  }),
  modules: Object.freeze([
    "cast.js",
    "cast-compact-skills.js",
    "cast-ui.js",
    "cast-style-skills.js",
    "cast-outfits.js",
    "cast-mobile.js",
    "cast-troops-link.js"
  ])
});

function applyOwnershipContract() {
  for (const [selector, owner] of Object.entries(composition.owners)) {
    const node = document.querySelector(selector);
    if (node) node.dataset.runtimeOwner = owner;
  }
  emitAppEvent(document, APP_EVENTS.CAST_COMPOSITION_READY, composition);
}

globalThis.TNX_CAST_APP = composition;
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyOwnershipContract, { once: true });
else applyOwnershipContract();

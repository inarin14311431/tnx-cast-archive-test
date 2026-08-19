# Mobile editor architecture

This document defines the runtime ownership boundaries for `sheet-mobile.html`.

## Entry point

`sheet-mobile.html` loads one module entry point: `js/sheet-mobile-app.js`.

`sheet-mobile-app.js` is the composition root. It imports the shared runtime and save coordinator before feature modules, then loads the individual editor features. Feature modules must not be added as independent module scripts in the HTML.

## Shared editor context

`js/sheet-mobile-runtime.js` is the only owner of:

- authentication through `requireAuth()`
- reading the `id` query parameter for the mobile editor context
- the owner-filtered `characters` lookup
- caching the resolved `{ user, character, publicId }` context

Feature modules consume `getMobileEditorContext()` instead of repeating authentication or character lookup. A feature may update the already-resolved character row when that is its responsibility; it must not independently select the editable character as a second source of truth.

## Save coordination

`js/sheet-mobile-save-coordinator.js` owns the cross-feature save boundary.

Before the base profile save is replayed it dispatches `tnx:mobile-before-save`. Features with their own tables or persistence responsibilities add promises through `event.detail.add(...)`. The coordinator waits for all registered tasks and only then replays the base save click.

Feature modules own their own persistence payloads and dirty data. The coordinator owns ordering and aggregate failure handling; it does not know outfit, skill, combo, ability, or other feature schemas.

## Feature ownership

- `sheet-mobile.js`: base character/profile fields, editor/view links, base character update.
- `sheet-mobile-profile.js`: profile presentation enhancements.
- `sheet-mobile-style.js`: selected styles and style-specific rules.
- `sheet-mobile-ability.js`: ability/control values, CS, and style-derived baselines.
- `sheet-mobile-skills.js`: general/social/connection/style skill editing and persistence.
- `sheet-mobile-outfit.js`: outfit editing and persistence; outfit field semantics are delegated to the shared outfit contract/model.
- `sheet-mobile-combos.js`: combo/counter editing and persistence.
- `sheet-mobile-snapshots.js`: snapshot lifecycle.
- `sheet-mobile-image.js`: character image lifecycle.
- remaining mobile modules own presentation/import helpers scoped to their named responsibility.

Modules should remain separate when their persistence model or lifecycle differs. File-count reduction alone is not a reason to merge them.

## Runtime invariants

`scripts/audit-mobile-editor-runtime.mjs` enforces the important boundaries on every Regression run:

1. `sheet-mobile.html` references existing local assets.
2. `sheet-mobile-app.js` has no duplicate or missing imports.
3. runtime and save coordinator load before feature modules.
4. `sheet-mobile-runtime.js` owns authentication and editable-character lookup.
5. feature modules do not call `requireAuth` or perform an independent `characters.select()` lookup.
6. the save coordinator retains the `tnx:mobile-before-save` / `Promise.all(tasks)` contract.
7. required mobile DOM anchors and explicit mobile viewer routing remain present.

## Refactor rule

Change one ownership boundary at a time. Preserve the current DOM ids, database mappings, save timing, and mobile Playwright behavior unless the task explicitly changes them. Run Regression plus Mobile E2E after each ownership change.

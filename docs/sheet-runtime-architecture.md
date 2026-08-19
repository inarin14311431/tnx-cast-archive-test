# Sheet editor runtime architecture

This document defines the safe refactoring boundary for `sheet.html`.

## Current rule

`js/sheet.js` remains the editor core for state mutation, rendering, load/save integration, and current-state capture. Existing enhancement modules continue to load in their current order. Refactoring must not change data mapping, save timing, DOM ids, or user-visible behavior unless a separate change explicitly requires it.

Dynamic skill/outfit row DOM events are now translated by `js/sheet-row-interactions.js`. That adapter owns delegated `input` / row-action `click` binding and emits semantic callbacks only. It does not own `skills`, `outfits`, recalculation, dirty state, persistence, or rendering. `sheet.js` receives those callbacks and remains the owner of editor-state mutation.

## Responsibility groups

- Core state mutation / rendering / load-save integration: `js/sheet.js`
- Dynamic skill/outfit row event translation: `js/sheet-row-interactions.js`
- Editor navigation and sidebar actions: `js/sheet-sidebar-actions.js`
- Character Sheets URL import: `js/sheet-import-url.js`
- Snapshots / recovery: `js/sheet-snapshots.js`
- Style skill presentation and compatibility: `js/style-skill-*.js`, `js/sheet-import-style-skill-compat.js`
- Master search and autofill: `js/sheet-master-search*.js`, `js/sheet-master-autofill.js`
- Outfit helpers and master data: `js/outfit-*.js`
- Combo / counter editor: sheet combo-related modules

## Refactoring sequence

1. Freeze and audit the current script graph.
2. Identify modules that modify the same DOM nodes or register overlapping handlers.
3. Move one responsibility at a time behind an explicit initializer without changing output.
4. Run regression and Playwright checks after every responsibility move.
5. Only after behavior is stable, reduce script count or merge modules.

## Phase 5 completion boundary

The responsibility/initialization refactor for `sheet.html` is considered complete at the Phase 5 boundary.

Completed work includes:

- runtime script graph auditing and DOM ownership reporting;
- consolidation of raw style-skill change ownership behind `tnx:style-skills-changed`;
- explicit, idempotent initializers for the low-risk startup responsibilities migrated during this phase;
- regression guards for each migrated initializer;
- browser coverage for style-skill detail/candidate rerender behavior;
- an integrated E2E path covering edit -> save -> reload -> candidate restoration.

The following areas were intentionally not consolidated in Phase 5 because they have a larger compatibility blast radius:

- legacy style-skill import compatibility;
- legacy outfit import compatibility;
- the finalized outfit table/display controller chain;
- save-status/save-button ownership shared with image, snapshot, and save-state helpers;
- any script-order reduction or module merging.

These are not unfinished Phase 5 tasks. They remain explicit future refactor candidates and should only be changed behind dedicated characterization coverage.

## Post-Phase 5 classic editor extraction

The save/load ownership work established separate persistence, serialization, normalization, and error boundaries. The first interaction-side extraction now moves dynamic row event binding out of `sheet.js`:

- `sheet-row-interactions.js` uses one explicit, idempotent initializer per root;
- skill field edits are emitted as `{ key, field, value, element, row }` callbacks;
- outfit field edits are emitted as `{ key, field, value, element, card }` callbacks;
- delete/move actions are emitted as semantic callbacks;
- `sheet.js` retains validation of editor state, suit/level coupling, category rerendering, collection mutation, recalculation, and dirty-state publication;
- rerendering skills or outfits no longer requires rebinding `element.oninput` handlers row by row.

This boundary is locked by `tests/sheet-row-interactions.test.mjs`.

## Safety contracts

- `js/sheet.js` is loaded exactly once.
- Local script references must exist and must not be duplicated.
- Core-dependent editor modules must not move before `js/sheet.js` without an explicit migration.
- Existing element ids and persisted data shape are compatibility contracts.
- Row interaction adapters must not own editor collections, persistence, recalculation, or dirty-state policy.
- Refactoring commits should avoid simultaneous CSS/layout changes.
- A failed runtime audit blocks the refactor before browser deployment.
- The integrated save/reload E2E is a release guard for future editor-runtime ownership changes.

The automated baseline for the runtime graph remains `scripts/audit-sheet-runtime.mjs`.

# Sheet editor runtime architecture

This document defines the safe refactoring boundary for `sheet.html`.

## Current rule

`js/sheet.js` remains the editor core for state mutation, load/save integration, and current-state capture. Existing enhancement modules continue to load in their current order. Refactoring must not change data mapping, save timing, DOM ids, or user-visible behavior unless a separate change explicitly requires it.

Dynamic skill/outfit row DOM events are translated by `js/sheet-row-interactions.js`. That adapter owns delegated `input` / row-action `click` binding and emits semantic callbacks only. It does not own `skills`, `outfits`, recalculation, dirty state, persistence, or rendering. `sheet.js` receives those callbacks and remains the owner of editor-state mutation.

Classic skill markup rendering is delegated to `js/sheet-skill-renderer.js`. The renderer receives explicit row collections plus separator/type-label helpers and returns markup for the general/social/connection and style-skill hosts. It does not own editor collections, event binding, recalculation, dirty state, load/save behavior, or DOM insertion.

Classic outfit card markup rendering is delegated to `js/sheet-outfit-renderer.js`. The renderer receives the current outfit collection and returns the raw category-specific card/control markup consumed by `outfit-tables.js`. It does not own editor state, event binding, table enhancement, OFC enrichment, recalculation, dirty state, persistence, or DOM insertion.

Classic blank skill/outfit record defaults are delegated to `js/sheet-row-factory.js`. The factory receives explicit key and sort-order inputs and owns only the DOM-free default object shape. `sheet.js` remains responsible for collection length/order and for contextual overrides used by master rows, blank slots, separators, and import application.

General-skill collection rules are delegated to `js/sheet-general-skill-state.js`. The helper owns master-row reconciliation, duplicate merging, initial blank-slot construction, and canonical general-skill ordering as DOM-free collection transforms. `sheet.js` keeps the live `skills` collection, browser-derived left/right placement for newly added blank rows, render invocation, dirty state, and persistence.

Classic SKD/OFC TSV parsing and base-row mapping are delegated to `js/sheet-tsv-import.js`. The helper owns tabular text parsing, SKD style-kind/level/name/description mapping, and the legacy OFC target/base-field mapping as DOM-free transforms. `sheet.js` continues to own the import dialog mode, blank-row identity/sort order, live collection mutation, rerendering, recalculation, and dirty state. Legacy Character Sheets JSON compatibility remains owned by its existing dedicated modules and is not part of this boundary.

Static character-editor markup for the three style cards and the four ability/control cards plus CS is delegated to `js/sheet-character-renderer.js`. The renderer receives style records, Utsuwa attributes, and ability descriptors and returns HTML only. `sheet.js` continues to own DOM insertion, the style-grid change listener, Utsuwa visibility, divine display, baseline calculation, recalculation, dirty state, load/save behavior, and all editor state.

## Responsibility groups

- Core state mutation / load-save integration / render orchestration: `js/sheet.js`
- General-skill collection normalization and ordering: `js/sheet-general-skill-state.js`
- Classic SKD/OFC TSV parsing and row mapping: `js/sheet-tsv-import.js`
- Static style/ability/CS editor markup: `js/sheet-character-renderer.js`
- Classic skill/outfit blank-record defaults: `js/sheet-row-factory.js`
- Classic skill markup generation: `js/sheet-skill-renderer.js`
- Classic outfit raw-card markup generation: `js/sheet-outfit-renderer.js`
- Dynamic skill/outfit row event translation: `js/sheet-row-interactions.js`
- Editor navigation and sidebar actions: `js/sheet-sidebar-actions.js`
- Character Sheets URL import: `js/sheet-import-url.js`
- Snapshots / recovery: `js/sheet-snapshots.js`
- Style skill presentation and compatibility: `js/style-skill-*.js`, `js/sheet-import-style-skill-compat.js`
- Legacy outfit import compatibility: `js/sheet-import-outfit-compat.js`
- Master search and autofill: `js/sheet-master-search*.js`, `js/sheet-master-autofill.js`
- Outfit table/display enhancement and master data: `js/outfit-*.js`
- Combo / counter editor: sheet combo-related modules

## Refactoring sequence

1. Freeze and audit the current script graph.
2. Identify modules that modify the same DOM nodes or register overlapping handlers.
3. Move one responsibility at a time behind an explicit boundary without changing output.
4. Run regression and Playwright checks after every responsibility move.
5. Only after behavior is stable, reduce script count or merge modules.

For low-risk extraction work, automated coverage is the primary release gate. Unit/contract tests must characterize the moved rules directly, and authenticated Playwright coverage must exercise representative add/edit/delete browser flows. Manual verification can then be limited to a short smoke pass unless CSS, persistence mappings, imports, or viewer rendering change.

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

The save/load ownership work established separate persistence, serialization, normalization, and error boundaries. The first interaction-side extraction moved dynamic row event binding out of `sheet.js`:

- `sheet-row-interactions.js` uses one explicit, idempotent initializer per root;
- skill field edits are emitted as `{ key, field, value, element, row }` callbacks;
- outfit field edits are emitted as `{ key, field, value, element, card }` callbacks;
- delete/move actions are emitted as semantic callbacks;
- `sheet.js` retains validation of editor state, suit/level coupling, category rerendering, collection mutation, recalculation, and dirty-state publication;
- rerendering skills or outfits no longer requires rebinding `element.oninput` handlers row by row.

This boundary is locked by `tests/sheet-row-interactions.test.mjs`.

The next extraction moved classic skill HTML generation behind a render-only boundary:

- `sheet-skill-renderer.js` owns general two-column markup, social/connection tables, style-skill rows, separator rows, suit controls, type labels, and row-action markup;
- `sheet.js` supplies the already ordered/filtered collections, the style-separator predicate, and any runtime style-kind label overrides;
- `sheet.js` remains responsible for inserting the returned markup into `#general-skills` and `#style-skills` and for all state mutation;
- the renderer has no access to `skills`, persistence, recalculation, dirty state, or event listeners.

This boundary is locked by `tests/sheet-skill-renderer.test.mjs`.

The following extraction moved classic outfit raw-card HTML generation behind the same render-only pattern:

- `sheet-outfit-renderer.js` owns category labels, raw card markup, category-specific base controls, delete-button markup, and user-value escaping;
- its output deliberately preserves the raw control schemas expected by `outfit-tables.js` for weapon, armor, cyberware, tron, vehicle, residence, and other categories;
- `sheet.js` retains the `outfits` collection, category mutation, delete behavior, render invocation, recalculation, dirty state, import application, and persistence;
- `outfit-tables.js` remains the sole owner of converting raw cards into the category table UI and is not merged into the renderer.

This boundary is locked by `tests/sheet-outfit-renderer.test.mjs`.

The next extraction moved blank skill/outfit defaults behind a DOM-free row-factory boundary:

- `sheet-row-factory.js` owns the default object shape for a new skill and a new outfit, including default skill kind and canonical blank outfit base fields;
- the factory accepts explicit key and sort-order inputs instead of reading editor collections;
- `sheet.js` keeps thin `blankSkill()` / `blankOutfit()` wrappers so current collection length remains the source of sort order;
- contextual overrides for fixed general skills, general blank slots, social/connection initial rows, style separators, and import base records are applied outside the factory;
- the factory has no DOM access, editor collection access, rendering, recalculation, dirty-state publication, or persistence responsibilities.

This boundary is locked by `tests/sheet-row-factory.test.mjs` and the outfit save-policy regression coverage.

The following extraction moved deterministic general-skill collection rules behind a pure state boundary:

- `sheet-general-skill-state.js` merges duplicate fixed master rows by preserving the strongest row, OR-combining suits, retaining the highest level/free-level values, and clamping free level after suit-count correction;
- missing fixed master rows are created through the shared row factory and marked `_fixedMaster`;
- the four initial blank general-skill slots retain their left/left/right/right metadata and sequential sort order;
- rendering order follows `GENERAL_MASTER` while custom general skills remain stable after fixed rows;
- `sheet.js` remains responsible for assigning the returned collection to live editor state and for choosing the column of a newly clicked `#add-general` row from current browser layout.

This boundary is locked by `tests/sheet-general-skill-state.test.mjs`. The authenticated browser gate additionally runs `tests/e2e/sheet-row-lifecycle.spec.js`, which exercises unsaved style/general/outfit add -> edit -> delete behavior and outfit category rerendering without writing test mutations to the database.

The next extraction moves the classic TSV dialog's deterministic parsing and row mapping out of `sheet.js`:

- `sheet-tsv-import.js` preserves CRLF cleanup, trimmed headers, blank-line handling, and escaped `\\n` restoration;
- SKD rows preserve the existing name/type/level/description mapping, including runtime style-kind label resolution with the existing secret/ultimate fallback;
- OFC rows preserve the existing target aliases and base-field mapping, including the existing intermediate combined concealment string consumed by the later OFC enhancement chain;
- `sheet.js` still chooses SKD versus OFC mode, creates blank records so keys and sort order remain current-state-owned, appends rows to `skills`/`outfits`, rerenders, recalculates, and marks the editor dirty;
- legacy JSON style/outfit compatibility modules are intentionally unchanged and remain separate owners.

This boundary is locked by `tests/sheet-tsv-import.test.mjs`. `tests/e2e/sheet-row-lifecycle.spec.js` now also exercises an SKD TSV import through the real dialog, while the existing `tests/e2e/outfit-import-transfer.spec.js` continues to exercise OFC TSV conversion through the full enhancement chain.

The following extraction moves only the deterministic character-editor markup out of `sheet.js`:

- `sheet-character-renderer.js` owns the HTML for the three style cards, mark selectors, hidden Utsuwa attribute selectors, divine placeholders, four ability/control matrices, and CS card;
- style and attribute names are escaped by the renderer before becoming option markup;
- `sheet.js` inserts the returned markup but retains the `#style-grid` change listener, Utsuwa show/hide behavior, divine lookup, baseline calculation, ability/control recalculation, editor state, persistence, and dirty-state ownership;
- no style-data semantics or ability/control formulas move into the renderer.

This boundary is locked by `tests/sheet-character-renderer.test.mjs`. The authenticated `tests/e2e/sheet-row-lifecycle.spec.js` additionally verifies all style/ability/CS controls and switches a style to Utsuwa to prove the existing change handler and divine/attribute behavior remain connected after rendering extraction.

## Safety contracts

- `js/sheet.js` is loaded exactly once.
- Local script references must exist and must not be duplicated.
- Core-dependent editor modules must not move before `js/sheet.js` without an explicit migration.
- Existing element ids and persisted data shape are compatibility contracts.
- Row interaction adapters must not own editor collections, persistence, recalculation, or dirty-state policy.
- Row factories must remain DOM-free, collection-free, rendering-free, and persistence-free; contextual sort-order policy remains in `sheet.js`.
- General-skill state helpers must remain DOM-free and persistence-free; browser-derived placement and live editor ownership remain in `sheet.js`.
- TSV import transforms must remain DOM-free, state-mutation-free, and persistence-free; dialog ownership and collection mutation remain in `sheet.js`, and legacy JSON compatibility remains outside this module.
- Character-editor renderers must remain DOM-free and event-free; style/ability behavior and calculations remain in `sheet.js`.
- Render-only modules must not mutate editor collections, bind events, publish dirty state, or perform persistence.
- Raw outfit renderer output must remain compatible with `outfit-tables.js` category schemas and direct-child card discovery.
- Refactoring commits should avoid simultaneous CSS/layout changes.
- A failed runtime audit blocks the refactor before browser deployment.
- The integrated save/reload E2E, row-lifecycle E2E, and existing OFC import E2E are release guards for future editor-runtime ownership changes.

The automated baseline for the runtime graph remains `scripts/audit-sheet-runtime.mjs`.

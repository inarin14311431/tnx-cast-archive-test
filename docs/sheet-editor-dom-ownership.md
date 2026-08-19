# Sheet editor DOM ownership audit

This document records the overlap map for `sheet.html` that was captured before runtime refactoring and the current ownership boundaries established during consolidation.

## Baseline before runtime refactoring

- Local scripts loaded by `sheet.html`: 37
- Literal DOM IDs detected across those scripts: 106
- DOM IDs referenced by more than one script: 28
- Duplicate literal event ownership detected: 1

## Baseline highest-overlap DOM areas

- `#save-status`: 6 scripts
  - `style-mark-cycle.js`
  - `sheet-image.js`
  - `ui-v25.js`
  - `sheet-features.js`
  - `sheet-birthplace.js`
  - `sheet-snapshots.js`
- `#style-skills`: 6 scripts
  - `ui-v25.js`
  - `sheet-features.js`
  - `style-skill-fields.js`
  - `style-skill-detail-integrity.js`
  - `sheet-multiline-fields-v3.js`
  - `sheet-master-autofill.js`
- `#outfit-list`: 5 scripts
  - `sheet-features.js`
  - `outfit-tables.js`
  - `armor-grand-total.js`
  - `sheet-multiline-fields-v3.js`
  - `sheet-master-autofill.js`
- `#save-button`: 5 scripts
  - `sheet-image.js`
  - `sheet-features.js`
  - `sheet-sticky-exp-panel.js`
  - `sheet-sidebar-actions.js`
  - `sheet-snapshots.js`

These overlaps are not automatically bugs. Some modules read the same state while others own presentation or synchronization.

## Style-skill input ownership: completed

The initial duplicate event ownership was `#style-skills` / `input` across `sheet-features.js`, `style-skill-fields.js`, and `style-skill-detail-integrity.js`.

That path has now been consolidated behind the canonical `tnx:style-skills-changed` event:

1. `style-skill-fields.js` owns raw `#style-skills` input bridging and the structural MutationObserver required to enhance newly rendered rows.
2. `style-skill-detail-integrity.js` no longer owns a raw input listener or MutationObserver; it consumes `tnx:style-skills-changed` and keeps the structured detail payload canonical.
3. `sheet-features.js` no longer owns raw style-skill input handling or a `#style-skills` MutationObserver; combo/counter candidate refresh consumes `tnx:style-skills-changed`.

Behavioral coverage protects visible/hidden structured detail synchronization, combo/counter refresh, structural rerenders, and separator-row reorder compatibility.

## Outfit ownership: current phase

### Armor defense totals: completed

`armor-grand-total.js` previously duplicated the S/P/I total synchronization already maintained by `outfit-tables.js`. The shim is now inert and no longer reads, observes, or mutates `#outfit-list`. `outfit-tables.js` is the sole runtime owner of armor total calculation and refresh.

### Multiline structural observer: completed

`sheet-multiline-fields-v3.js` previously maintained its own `MutationObserver` on `#outfit-list` so that text fields could be converted and normalized after `outfit-tables.js` rebuilt the table DOM.

That timing dependency is now replaced by an explicit completion contract:

1. `outfit-tables.js` remains the structural owner of the outfit table DOM and dispatches `tnx:outfit-tables-rendered` immediately after replacing the rendered category tables.
2. `sheet-multiline-fields-v3.js` subscribes to `tnx:outfit-tables-rendered` and queues its idempotent multiline enhancement.
3. `sheet-multiline-fields-v3.js` no longer observes `#outfit-list` structurally.
4. Initial load remains safe because multiline enhancement still performs its own initial `queue()`, while saved DB values are restored through `loadOriginalOutfits()` and its existing queue path.

Regression coverage locks the event publisher/consumer boundary and verifies that the removed outfit observer is not restored. Authenticated Playwright coverage exercises category addition and row reorder, confirming multiline conversion and field values survive the rebuild lifecycle.

### Current active responsibilities

- `outfit-tables.js`: category table structure, structural MutationObserver, row ordering, armor S/P/I presentation and totals, and `tnx:outfit-tables-rendered` publication.
- `sheet-multiline-fields-v3.js`: multiline conversion/normalization and restoration of outfit text values; no structural outfit observer.
- `sheet-master-autofill.js`: user-triggered SKD/OFC master completion; reads current outfit rows only while autofill is running and does not continuously observe the root.
- `outfit-pc-field-policy.js`: compatibility policy for DB-backed PC outfit proxy fields and legacy concealment normalization.

`sheet-features.js` and `armor-grand-total.js` no longer participate in active outfit-root ownership.

## Next outfit boundary

The next candidate is not another raw `#outfit-list` listener removal. The remaining consumers have distinct responsibilities. Before further consolidation, inspect `outfit-pc-field-policy.js` and the base `outfit-tables.js` schema against the canonical contract in `docs/outfit-data-contract.md`, especially legacy-only field generation and compatibility proxy ownership.

`sheet-master-autofill.js` should remain action-scoped for now; it is not a competing structural owner.

## Deferred high-overlap areas

`#save-status` and `#save-button` remain deferred. They touch save state, image handling, snapshots, layout, and editor lifecycle, so their blast radius remains larger than the current outfit work.

## Guardrails

Before changing runtime ownership:

- keep `sheet.html` script order unchanged unless a dedicated test covers the change;
- do not change database persistence, payload format, DOM IDs, or save timing;
- preserve the style-skill canonical payload prefix `@@TNX_STYLE_DETAIL_V1@@`;
- preserve canonical outfit semantics documented in `docs/outfit-data-contract.md`;
- add a regression test for each responsibility before removing an existing listener;
- migrate one listener or initializer at a time and run Regression checks + Playwright after each step.

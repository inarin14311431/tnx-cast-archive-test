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

The first `#outfit-list` responsibility has now been consolidated.

### Armor defense totals: completed

`armor-grand-total.js` previously duplicated the S/P/I total synchronization already maintained by `outfit-tables.js`. The shim is now inert and no longer reads, observes, or mutates `#outfit-list`. `outfit-tables.js` is the sole runtime owner of armor total calculation and refresh.

This reduces the active outfit responsibilities to distinct roles:

- `outfit-tables.js`: category table structure, row ordering, armor S/P/I presentation and totals.
- `sheet-multiline-fields-v3.js`: multiline conversion/normalization and restoration of outfit text values; it still owns a structural `#outfit-list` MutationObserver.
- `sheet-master-autofill.js`: user-triggered SKD/OFC master completion; it reads current outfit rows only while autofill is running and does not continuously observe the root.
- `outfit-pc-field-policy.js`: compatibility policy for DB-backed PC outfit proxy fields and legacy concealment normalization.

`sheet-features.js` no longer participates in outfit-root ownership.

### Next outfit boundary

The next listener-level consolidation target is `sheet-multiline-fields-v3.js`'s structural observer on `#outfit-list`.

Before removing it, `outfit-tables.js` must expose an explicit post-render completion contract so multiline enhancement can run after initial load, category changes, reorder rebuilds, imports, and saved-data restoration without relying on timing. The observer must not be removed until that event path has dedicated Regression and Playwright coverage.

`sheet-master-autofill.js` should remain an action-scoped consumer for now; it is not a competing structural owner.

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

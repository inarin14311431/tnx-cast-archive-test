# Sheet editor DOM ownership audit

This document records the overlap map for `sheet.html` that was captured before runtime refactoring, plus the current disposition of the first refactor candidate.

## Baseline before runtime refactoring

- Local scripts loaded by `sheet.html`: 37
- Literal DOM IDs detected across those scripts: 106
- DOM IDs referenced by more than one script: 28
- Duplicate literal event ownership detected: 1

## Highest-overlap DOM areas

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

## First refactor candidate: completed

The initial duplicate event ownership was `#style-skills` / `input` across `sheet-features.js`, `style-skill-fields.js`, and `style-skill-detail-integrity.js`.

That path has now been consolidated behind the canonical `tnx:style-skills-changed` event:

1. `style-skill-fields.js` owns raw `#style-skills` input bridging and the structural MutationObserver required to enhance newly rendered rows.
2. `style-skill-detail-integrity.js` no longer owns a raw input listener or MutationObserver; it consumes `tnx:style-skills-changed` and keeps the structured detail payload canonical.
3. `sheet-features.js` no longer owns raw style-skill input handling or a `#style-skills` MutationObserver; combo/counter candidate refresh consumes `tnx:style-skills-changed`.

Behavioral coverage now protects:

- visible structured detail -> hidden canonical description synchronization;
- hidden canonical description -> visible structured detail synchronization;
- style-skill name/level changes -> combo and counter candidate refresh;
- structural rerenders without row/cell multiplication;
- separator-row reorder compatibility.

`sheet-features.js` intentionally still observes the combo/counter candidate output roots themselves (`#sheet-combo-skill-options` and `#sheet-counter-skill`). E2E coverage confirms those observers restore style-skill candidates if a downstream renderer replaces those presentation containers. They are therefore compatibility observers, not duplicate ownership of the style-skill source DOM, and should not be removed until the downstream renderers expose an explicit completion event or equivalent contract.

## Deferred high-overlap areas

`#save-status`, `#save-button`, and `#outfit-list` should not be consolidated yet. They touch save state, image handling, snapshots, layout, and outfit rendering, so their blast radius is larger than the style-skill input path.

## Next refactor boundary

The next safe phase is to move one existing responsibility at a time behind an explicit, idempotent initializer while preserving `sheet.html` script order and output. Do not reduce script count or merge modules until those initialization contracts have browser coverage.

## Guardrails

Before changing runtime ownership:

- keep `sheet.html` script order unchanged unless a dedicated test covers the change;
- do not change database persistence, payload format, DOM IDs, or save timing;
- preserve the style-skill canonical payload prefix `@@TNX_STYLE_DETAIL_V1@@`;
- add a regression test for each responsibility before removing an existing listener;
- migrate one listener or initializer at a time and run Regression checks + Playwright after each step.

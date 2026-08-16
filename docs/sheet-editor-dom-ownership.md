# Sheet editor DOM ownership audit

This document records the current overlap map for `sheet.html` before runtime refactoring.
It is intentionally descriptive: no editor behavior is changed by this document or by `scripts/report-sheet-dom-ownership.mjs`.

## Current baseline

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

## First refactor candidate

The only duplicate literal event ownership currently detected is:

- `#style-skills` / `input`
  - `sheet-features.js`
  - `style-skill-fields.js`
  - `style-skill-detail-integrity.js`

The three listeners currently have distinct purposes:

1. `sheet-features.js` updates combo/counter skill candidates when style skills change.
2. `style-skill-fields.js` synchronizes the visible structured fields with the hidden canonical description payload.
3. `style-skill-detail-integrity.js` repairs/canonicalizes structured style-skill detail data.

Because all three are independently attached to the same root event, this is the best first candidate for a controlled ownership refactor. It should be migrated one responsibility at a time, with the current listener behavior kept as the compatibility baseline until E2E/regression coverage exists for each responsibility.

## Deferred high-overlap areas

`#save-status`, `#save-button`, and `#outfit-list` should not be consolidated yet. They touch save state, image handling, snapshots, layout, and outfit rendering, so their blast radius is larger than the style-skill input path.

## Guardrails

Before changing runtime ownership:

- keep `sheet.html` script order unchanged unless a dedicated test covers the change;
- do not change database persistence, payload format, DOM IDs, or save timing;
- preserve the style-skill canonical payload prefix `@@TNX_STYLE_DETAIL_V1@@`;
- add a regression test for each responsibility before removing an existing listener;
- migrate one listener at a time and run Regression checks + Playwright after each step.

# Cast view runtime architecture

This document defines the safe refactoring boundary for `cast.html`.

## Current rule

`js/cast.js` remains the public cast-view core. Existing enhancement modules continue to load in their current order. The responsibility/initialization refactor must not change data mapping, render timing, DOM ids, or user-visible behavior unless a separate change explicitly requires it.

## Responsibility groups

- Core character load and base rendering: `js/cast.js`
- Shared cast UI and ownership-dependent edit link: `js/cast-ui.js`
- View mode selection: `js/cast-view-mode.js`
- Tabs, summary, description controls, panel collapse, and public id display: `js/cast-view-controls.js`
- General / Social / Connection skill layout: `js/cast-compact-skills.js`
- Style skill detail view: `js/cast-style-skills.js`
- Outfit detail view and armor totals: `js/cast-outfits.js`
- Mobile cast rendering: `js/cast-mobile.js`
- Mobile combo enhancement / counters: `js/cast-mobile-combos.js`
- Presentation-only style/divine enhancement: `js/cast-archetype-view.js`
- Cyber-scan presentation effects: `js/cast-cyberscan.js`, `js/cast-cyber-trigger.js`
- Quick-sheet presentation/layout: `js/cast-quick-sheet-compact.js`, `js/quick-sheet-paper-layout.js`
- Direct transfer dialog/trigger behavior: `js/direct-transfer-button.js`

## Refactoring sequence

1. Freeze and audit the current script graph.
2. Inventory shared DOM ownership and lifecycle registrations.
3. Move one low-risk responsibility at a time behind an explicit idempotent initializer.
4. Add a regression contract for each migrated responsibility.
5. Run regression and Playwright checks after every runtime change.
6. Only after behavior is stable, consider script-count reduction or module merging.

## Phase 6 completion boundary

The responsibility/initialization refactor for `cast.html` is considered complete at the current boundary.

Completed work includes:

- runtime script-graph auditing with `scripts/audit-cast-runtime.mjs`;
- DOM ownership and lifecycle inventory with `scripts/report-cast-dom-ownership.mjs`;
- explicit idempotent initialization for view-mode selection;
- explicit idempotent initialization for cast tabs, summary controls, description controls, collapsible panels, and public-id display;
- explicit idempotent initialization for mobile cast rendering and mobile combo enhancement;
- explicit idempotent initialization for outfit rendering, style-skill rendering, and compact General / Social / Connection skill layout;
- regression contracts for the migrated responsibilities;
- Playwright coverage retained as the browser-level release guard;
- manual verification of mobile view, style/outfit descriptions, tabs/panels, outfit totals, and compact skill layout during the phase.

The following areas are intentionally not consolidated in Phase 6 because their timing or compatibility blast radius is larger:

- `js/cast.js` core data load/base render flow;
- `js/cast-ui.js` shared post-render helpers and ownership-dependent edit-link logic;
- `js/cast-archetype-view.js` presentation enhancement tied to `tnx:style-skills-rendered`;
- quick-sheet MutationObserver-based reflow/recovery helpers;
- cyber-scan / cyber-trigger animation timing;
- direct-transfer delegated document handlers;
- any script-order reduction or module merging.

These are not unfinished Phase 6 tasks. They remain explicit future refactor candidates and should only be changed behind dedicated characterization coverage.

## Safety contracts

- `js/cast.js` is loaded exactly once.
- The audited `cast.html` script graph remains valid and local script references must exist without duplicates.
- Core-dependent modules must remain after `js/cast.js` unless a dedicated migration changes that contract.
- Existing element ids and public-view data shape are compatibility contracts.
- Shared DOM access is not itself a defect; ownership changes require evidence of duplicate responsibility or lifecycle behavior.
- Existing MutationObservers that provide render/reflow recovery are retained unless a replacement lifecycle is proven equivalent.
- Refactoring commits should avoid simultaneous CSS/layout changes.
- Regression, Playwright, and Pages deployment checks must remain green before the next runtime responsibility is changed.

The automated baselines for these rules are `scripts/audit-cast-runtime.mjs` and `scripts/report-cast-dom-ownership.mjs`.

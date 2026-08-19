# Cast view runtime architecture

This document defines the safe refactoring boundary for `cast.html`.

## Current rule

`js/cast.js` remains the public cast-view core. Existing enhancement modules continue to load in their current order. Data mapping, render timing, DOM ids, and user-visible behavior are compatibility contracts unless a separate approved change explicitly alters them.

## Responsibility groups

- Core character load, base rendering, and quick-sheet row/schema rendering: `js/cast.js`
- Shared read-only public data cache: `js/cast-data-store.js`
- Canonical read-only outfit normalization and paired display values: `js/outfit-view-model.js`
- Shared cast UI and ownership-dependent edit link: `js/cast-ui.js`
- View mode selection: `js/cast-view-mode.js`
- Tabs, summary, description controls, panel collapse, and public id display: `js/cast-view-controls.js`
- General / Social / Connection skill layout: `js/cast-compact-skills.js`
- Style skill detail view: `js/cast-style-skills.js`
- Outfit detail view and armor totals: `js/cast-outfits.js`
- Mobile cast rendering and mobile combo counters: `js/cast-mobile.js`
- Presentation-only style/divine enhancement: `js/cast-archetype-view.js`
- Cyber-scan presentation effects: `js/cast-cyberscan.js`, `js/cast-cyber-trigger.js`
- Quick-sheet content compaction/page allocation: `js/cast-quick-sheet-compact.js`
- Quick-sheet paper counters/stable section ordering: `js/quick-sheet-paper-layout.js`
- Direct transfer dialog/trigger behavior: `js/direct-transfer-button.js`

## Canonical outfit view contract

Public PC, mobile, and quick-sheet views share the same read-only outfit semantics.

- `concealment` is the concealment value only.
- `ofc_details.concealment_penalty` is the concealment modifier.
- Quick/mobile paired display renders these as `隠匿値/修正値`.
- Quick/mobile purchase display renders purchase target/permanent cost as `購入値/常備化値` under the `購入` label.
- `control_modifier` is displayed as `制御値` and is valid for armor and vehicle.
- `cs_modifier` is displayed as `CS修正` and is valid for tron and vehicle.
- `ofc_details.control_value` and `ofc_details.cs_value` are legacy compatibility data and are not canonical public-view fields.
- `mundane_modifier` is not an outfit display field.
- Manufacturer is retained in stored data but is not part of the current outfit editing/display contract.

Legacy combined concealment values such as `12/-1` remain readable, but new/current data is represented by the two separate stored fields above.

## Quick-sheet ownership

Quick-sheet outfit values are rendered directly by `js/cast.js`. There is no post-render outfit data patch module.

The two layout helpers remain intentionally separate:

- `js/cast-quick-sheet-compact.js` owns empty-section cleanup, page overflow checks, and page-three attach/detach behavior.
- `js/quick-sheet-paper-layout.js` owns paper counters and stable paper section ordering.

Neither helper should recreate or rewrite outfit columns or outfit values. Outfit table sizing belongs to stylesheet rules rather than runtime DOM patching.

## Refactoring sequence

1. Freeze and audit the current script graph.
2. Inventory shared DOM ownership and lifecycle registrations.
3. Move one low-risk responsibility at a time behind an explicit/idempotent boundary.
4. Add a regression contract for each migrated responsibility.
5. Run regression and Playwright checks after every runtime change.
6. Only after behavior is stable, consider script-count reduction or module merging.

## Current completion boundary

Completed work includes:

- runtime script-graph auditing with `scripts/audit-cast-runtime.mjs`;
- DOM ownership and lifecycle inventory with `scripts/report-cast-dom-ownership.mjs`;
- explicit initialization for view-mode selection, tabs/summary/description controls, panels, and public-id display;
- mobile cast rendering and mobile combo counters consolidated into `js/cast-mobile.js`;
- outfit, style-skill, and compact General / Social / Connection presentation boundaries;
- canonical public outfit normalization shared through `js/outfit-view-model.js`;
- quick-sheet purchase/concealment pair rendering moved into the core renderer, retiring the former post-render outfit patch;
- regression contracts and Playwright coverage as release guards.

The following areas remain intentionally separate because their timing or compatibility blast radius is larger:

- `js/cast.js` core data load/base render flow;
- `js/cast-ui.js` shared post-render helpers and ownership-dependent edit-link logic;
- `js/cast-archetype-view.js` presentation enhancement tied to `tnx:style-skills-rendered`;
- quick-sheet compaction and paper-layout recovery helpers;
- cyber-scan / cyber-trigger animation timing;
- direct-transfer delegated document handlers.

## Safety contracts

- `js/cast.js` is loaded exactly once.
- The audited `cast.html` script graph remains valid and local script references must exist without duplicates.
- Core-dependent modules must remain after `js/cast.js` unless a dedicated migration changes that contract.
- Existing element ids and public-view data shape are compatibility contracts.
- `js/cast-quick-outfit-pairs.js` must not return; quick outfit data/schema rendering belongs to `js/cast.js`.
- The retired `js/cast-mobile-combos.js` must not be loaded or restored.
- Shared DOM access is not itself a defect; ownership changes require evidence of duplicate responsibility or lifecycle behavior.
- Existing MutationObservers that provide render/reflow recovery are retained unless a replacement lifecycle is proven equivalent.
- Regression, Playwright, and Pages deployment checks must remain green before promotion.

The automated baselines for these rules are `scripts/audit-cast-runtime.mjs` and `scripts/report-cast-dom-ownership.mjs`.

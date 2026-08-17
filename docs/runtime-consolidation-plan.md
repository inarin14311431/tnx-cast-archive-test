# Runtime consolidation plan

This document defines the next refactoring phase after the sheet and cast responsibility/initialization work.

## Goal

Reduce avoidable runtime duplication and script-count only where there is a concrete maintenance or lifecycle benefit. File-count reduction by itself is not a goal.

Every consolidation must preserve the existing data shape, DOM ids, visible output, render timing, and recovery behavior unless a separate approved change explicitly alters them.

## Preconditions

- Sheet runtime responsibility phase is closed and guarded by audits/regression/E2E.
- Cast runtime responsibility phase is closed and guarded by audits/regression/E2E.
- Existing explicit/idempotent initializer contracts remain release guards.
- A consolidation candidate must have characterization coverage before runtime files are merged or removed.
- Only one consolidation boundary is changed at a time.

## Candidate order

### 1. Mobile cast + mobile combo enhancement

Files:

- `js/cast-mobile.js`
- `js/cast-mobile-combos.js`

Why this is the first candidate:

- both are mobile-only and share `#mobile-cast-view` ownership;
- `cast-mobile.js` already loads combo data as part of the initial mobile data request;
- `cast-mobile-combos.js` currently fetches combo data again after the base mobile render;
- the second module needs a MutationObserver only because it waits for the first module to create `.mobile-combo-list`;
- one owner can potentially remove the duplicate combo fetch and delayed enhancement observer while preserving the same rendered combo cards and localStorage counter behavior.

Required guard before merge:

- browser characterization for mobile view startup;
- combo/counter rendering when an ACT-use limit exists;
- checkbox/card-tap/reset behavior;
- counter persistence across reload;
- direct-transfer button synchronization and PC-view link behavior.

Do not merge until those behaviors are covered sufficiently to detect regressions.

### 2. Cast skill presentation modules

Files:

- `js/cast-compact-skills.js`
- `js/cast-style-skills.js`

Potential benefit:

- both are post-core skill presentation owners and wait for cast readiness.

Reason to defer:

- they intentionally own different DOM structures and style-skill rendering emits `tnx:style-skills-rendered` for another presentation layer;
- merging provides less lifecycle simplification than the mobile candidate.

### 3. Quick-sheet presentation pair

Files:

- `js/cast-quick-sheet-compact.js`
- `js/quick-sheet-paper-layout.js`

Potential benefit:

- both affect quick-sheet presentation and page layout.

Reason to defer:

- layout/reflow MutationObservers are timing-sensitive and currently serve recovery behavior;
- characterization must cover A4 page allocation, expanded descriptions, and print layout before any merge.

## Explicit non-candidates for this phase

Do not consolidate these merely to reduce file count:

- `js/cast.js` core data loading and base rendering;
- `js/cast-ui.js` ownership-sensitive shared UI helpers;
- `js/cast-archetype-view.js` event-driven presentation enhancement;
- cyber-scan/cyber-trigger animation modules;
- direct-transfer delegated handlers;
- high-risk sheet import/outfit/save compatibility modules documented in the sheet runtime architecture.

## Execution sequence

For each candidate:

1. Add or strengthen characterization tests without changing runtime behavior.
2. Confirm Regression, Playwright E2E, and Pages are green.
3. Merge/remove exactly one runtime boundary.
4. Update runtime audits for the new script graph in the same logical migration.
5. Confirm automated checks and targeted manual checks.
6. Stop and reevaluate before choosing another candidate.

The first implementation target is the mobile cast/mobile combo boundary. The next code change should be characterization coverage, not the merge itself.

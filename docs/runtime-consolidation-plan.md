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

### 1. Mobile cast + mobile combo enhancement — completed

Files:

- `js/cast-mobile.js`
- retired `js/cast-mobile-combos.js`

Result:

- mobile combo rendering and ACT-use counters are now owned directly by `cast-mobile.js`;
- the duplicate combo fetch was removed;
- the delayed MutationObserver enhancement path was removed;
- `cast.html` no longer loads the retired module;
- the retired runtime file was deleted after regression, Playwright, Pages, and targeted manual verification passed.

### 2. Cast skill presentation modules — keep separate

Files:

- `js/cast-compact-skills.js`
- `js/cast-style-skills.js`

Evaluation result:

- characterization coverage now locks their current ownership boundary;
- `cast-compact-skills.js` is a DOM-normalization/layout owner for General / Social / Connection sections already rendered by the core cast view;
- `cast-style-skills.js` is a separate data-loading/render owner for Style Skills and emits `tnx:style-skills-rendered` for downstream presentation behavior;
- there is no duplicate skill data fetch shared between these two modules;
- their cast-ready waits protect different render paths and combining them would not remove a meaningful recovery boundary;
- merging them would primarily reduce file count while increasing coupling between distinct public-view responsibilities.

Decision:

Do not merge these files in the current consolidation phase. Keep the characterization test as a guard for the intentional separation.

### 3. Quick-sheet presentation pair — keep separate

Files:

- `js/cast-quick-sheet-compact.js`
- `js/quick-sheet-paper-layout.js`

Evaluation result:

- characterization coverage locks the layout boundary;
- `cast-quick-sheet-compact.js` owns content compaction, empty-block cleanup, page-2 overflow detection, and page-3 attach/detach behavior;
- `quick-sheet-paper-layout.js` owns paper-counter conversion and stable page-2 section ordering;
- both observe the quick-sheet DOM and react to detail-toggle/resize because they recover different timing-sensitive presentation responsibilities;
- a merge would couple page allocation to paper-only normalization without removing a duplicated data load or rendering pipeline.

Decision:

Do not merge these files. Keep the quick-sheet characterization test as a guard for the intentional separation.

### 4. Quick-sheet outfit post-render patch — retired

The temporary `js/cast-quick-outfit-pairs.js` layer had become a third owner of quick-sheet outfit columns and values. Unlike the two layout modules above, it duplicated a responsibility that belongs to the core renderer.

Result:

- purchase and concealment paired values are rendered directly by `js/cast.js`;
- canonical outfit data is normalized by `js/outfit-view-model.js`;
- quick-sheet outfit sizing is owned by CSS;
- `cast-quick-outfit-pairs.js` and its dynamic import were removed;
- `cast-quick-sheet-compact.js` and `quick-sheet-paper-layout.js` remain separate and unchanged in responsibility.

This cleanup is not a reversal of the decision to keep the two layout helpers separate. It removes only the redundant third data/schema mutation owner.

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
3. Merge/remove exactly one runtime boundary only when the evaluation shows a concrete lifecycle or maintenance benefit.
4. Update runtime audits for the new script graph in the same logical migration.
5. Confirm automated checks and targeted manual checks.
6. Stop and reevaluate before choosing another candidate.

## Phase status — complete

The consolidation candidates identified for this phase have been evaluated.

- The mobile cast/mobile combo boundary was consolidated because it removed a duplicate data fetch and delayed enhancement observer.
- The cast skill presentation pair remains separate because the modules own different data/render responsibilities.
- The quick-sheet presentation pair remains separate because the modules own different timing-sensitive page-layout responsibilities.
- The later quick-sheet outfit post-render patch was retired because it duplicated core data/schema rendering rather than providing a distinct recovery responsibility.

No further runtime files should be merged merely to reduce script count. Additional consolidation should start only when a concrete duplicated lifecycle, data load, or rendering responsibility is identified and covered by dedicated regression/E2E characterization first.

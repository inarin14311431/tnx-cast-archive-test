# P3 Phase B audit

Phase B is an observation-only audit based on the Phase A baseline. Runtime behavior, CSS, JavaScript, HTML and database data are not changed in this phase.

## Baseline

Phase A fixed the current stable behavior before refactoring. Existing CI gates are green: Regression, Playwright E2E, Visual Regression, Quality gates and Security audit.

## Overall assessment

The application is no longer in a broadly tangled state. Previous refactoring established explicit CSS entries, module ownership, mobile-editor composition, authentication sharing and runtime audits. P3 should therefore avoid a large rewrite. The remaining work is concentrated in a few high-value lifecycle boundaries.

### Priority A — stabilize async page lifecycles

The largest remaining operational risk is pages that perform several network operations while owning their own loading/busy state.

Primary target: `js/acts-app.js`.

Current responsibilities in one module include:

- authentication startup;
- owned-character lookup;
- act-participation lookup;
- experience-spending lookup;
- filters and rendering;
- earned EXP update;
- participation deletion;
- spending creation/deletion;
- confirmation-dialog lifecycle;
- page-wide busy state.

The module does reach explicit success/empty/error states for normal Supabase error results, which is good. However, its data queries and write operations do not share the authentication module's timeout boundary, and busy-state release is repeated around individual operations instead of being protected by one common `try/finally` execution boundary.

Phase C recommendation:

1. introduce a small shared async-operation helper for timeout + normalized errors + busy cleanup;
2. apply it first to acts/experience management only;
3. do not change database mappings, DOM ids or visible success/error wording in the same change;
4. characterize timeout/network-failure behavior before changing other pages.

### Priority A — extend visual characterization before structural changes

Current Visual Regression already covers desktop/mobile login, archive, cast view, troop management/view and desktop sheet editing. Important operational screens still lack screenshot baselines:

- account;
- acts / experience history;
- showcase generator;
- mobile editor.

Phase C/D refactoring should not restructure those screens until the relevant baseline is added. Visual snapshots should remain deterministic fixtures and must not depend on production data.

### Priority B — CSS

CSS architecture is in good condition and should not be globally rebuilt again.

Current safeguards already enforce:

- one page/application entry plus theme entry;
- named cascade layers;
- no production `!important`;
- no runtime `<style>` or stylesheet injection;
- no legacy CSS runtime;
- page-specific ownership under `pages/`, editor ownership under `editor/`, reusable controls under `components/`;
- theme selectors isolated under `themes/`.

The largest stylesheet remains the editor stylesheet, so future CSS work should be local extraction only when a concrete ownership boundary exists. File-count reduction is not a goal.

Phase C/D recommendation: leave the CSS architecture intact; only split large files when it removes duplicate ownership or makes a currently mixed responsive/component responsibility explicit.

### Priority B — JavaScript module graph

The module graph has an automated audit for missing imports, retired runtimes and cycles. Previous consolidation work correctly rejected merges that would only reduce file count.

Existing architecture documents already establish strong ownership for:

- cast runtime;
- PC sheet runtime/save state;
- mobile editor runtime/save coordinator;
- outfit data contract;
- direct-transfer and import compatibility boundaries.

Phase C/D should preserve this approach. Do not perform a broad module merge. New consolidation is justified only when at least one of these is true:

- duplicate data fetch;
- duplicate DOM owner;
- duplicate lifecycle/observer;
- duplicate save/error boundary.

### Priority B — mobile editor

Mobile editor structure is comparatively strong.

`sheet-mobile-app.js` is the composition root; `sheet-mobile-runtime.js` owns authentication and editable-character lookup; `sheet-mobile-save-coordinator.js` owns cross-feature save ordering. Runtime audits prevent feature modules from performing their own editable-character lookup.

Phase C recommendation: keep this architecture. Focus mobile work on regression coverage and failure-state behavior rather than reorganizing modules.

### Priority B — Supabase access

Security ownership/RLS was addressed in P0/P1. P3 should not redesign the database access model unless a concrete runtime problem is found.

The most useful application-level improvement is consistency around network lifecycle:

- authentication already has a 5-second timeout and in-flight request sharing;
- application SELECT/INSERT/UPDATE/DELETE calls use page-specific handling;
- page-level error messages are generally present but timeout/retry behavior is not uniform.

Phase C should introduce the common lifecycle helper at one screen boundary first, then evaluate whether reuse elsewhere actually reduces complexity.

### Priority C — error/empty-state contract

Adopt a common conceptual page contract without forcing every page into a framework:

`LOADING -> SUCCESS | EMPTY | ERROR`

Required properties:

- loading state cannot remain indefinitely after a timeout;
- empty is not treated as an error;
- retry or navigation remains possible after error;
- optional presentation modules cannot prevent core content from becoming usable;
- state cleanup is guaranteed after write failures.

The repaired showcase generator is the reference pattern for separating core initialization from optional presentation modules.

### Priority C — tests

The current test system is extensive but has distinct responsibilities and should not be reduced merely because there are many tests.

Keep these boundaries:

- contract/unit-style Node tests: DOM/data/module invariants;
- Playwright E2E: real user flows;
- mobile E2E: mobile-specific behavior;
- Visual Regression: appearance/layout;
- Security audit: unsafe patterns/exposure;
- Quality gates: accessibility/performance budgets.

During Phase C/D, remove a test only when another test demonstrably covers the same failure mode at the same or better layer.

## Phase C work order

1. Add deterministic Visual Regression coverage for acts/experience and showcase generator, then account/mobile editor where stable fixtures permit it.
2. Characterize acts/experience timeout, failed SELECT and failed write states.
3. Add one common async operation boundary to acts/experience management with guaranteed busy cleanup.
4. Verify PC + iPhone-equivalent E2E and visuals.
5. Audit other high-network pages against the same contract and migrate only where it produces a concrete simplification.
6. After runtime stability work, consider small CSS/JS ownership cleanups one boundary at a time.

## Explicit non-goals

- no application framework migration;
- no wholesale Supabase repository/service layer rewrite;
- no global CSS rebuild;
- no module merge for file-count reduction;
- no visual redesign;
- no database schema change solely for P3 cleanup.

## Phase B conclusion

The codebase is suitable for incremental stabilization rather than another broad refactor. The highest-value next step is to protect asynchronous lifecycle behavior on the acts/experience screen and to extend deterministic visual coverage to the operational screens that have historically caused mobile/runtime regressions.
# P3 Phase E — Final audit

Date: 2026-08-28
Baseline: `main` after PR #161

## Purpose

Phase E is the final cross-cutting audit after the Phase A–D stabilization/refactoring work. It does not start another broad refactor. The goal is to decide which remaining structures should be kept, which clearly redundant work should be removed, and which areas should only be changed when a concrete defect appears.

## Current assessment

### CSS

- Keep the current `css-next` architecture.
- Page entry CSS, shared components and theme entries already have explicit ownership and automated audits.
- Do not reintroduce legacy `css/`, legacy `theme.js`, runtime `<style>` generation or JavaScript-driven CSS loading.
- Do not merge page entry files merely to reduce file count. Local ownership is preferred over a larger shared stylesheet.
- Visual Regression is the final rendered-appearance guard; presentation contract tests remain useful for structural layout invariants.

Decision: **no additional CSS refactor in Phase E**.

### JavaScript / async lifecycle

- Keep `js/async-timeout.js` as the shared finite-time boundary.
- Keep page-specific busy state, confirmation UI, ownership checks and user-facing error messages inside each page module.
- Keep `acts-app.js` local `runBusyAction()` rather than promoting it to a global helper.
- Do not abstract Supabase queries into a generic repository layer unless multiple screens acquire genuinely identical query/ownership/error semantics.

Decision: **current abstraction boundary is sufficient**.

### MutationObserver / timers

`showcase-wording.js` still uses a document-wide `MutationObserver`, but the previous self-triggering loop is guarded in two ways:

- writes only occur when `textContent` / `dataset.state` actually change;
- observer callbacks are coalesced through one queued microtask.

This observer exists to normalize generator wording after dynamic DOM updates. Since the observed values are now idempotent and the freeze regression is covered, replacing it during Phase E would add risk without a demonstrated benefit.

Decision: **keep; change only if profiling or a concrete defect shows a problem**.

### Tests and CI

The test responsibilities remain intentionally separated:

- Regression checks: static/runtime contracts and Node test suites.
- Playwright E2E: user flows and browser behavior.
- Visual Regression: rendered appearance.
- Quality gates: accessibility and performance budgets.
- Security audit: security invariants.

One exact duplication was found: `npm run verify` executed `audit:security`, while the independent `Security audit` GitHub Actions workflow executed the same script again for every pull request and `main` push. Phase E removes only the copy inside `verify`, preserving the dedicated Security audit status check.

Other apparent overlaps are retained when they cover different browser projects, different responsibilities or different failure modes.

### Mobile / desktop

- Keep mobile editor runtime ownership separate from desktop editor behavior.
- Keep mobile E2E and operational Visual Regression baselines added in Phase C.
- Do not consolidate mobile and desktop DOM behavior solely to reduce code count.

Decision: **no structural merge**.

### Database / security

P0–P2 database/RLS/security work remains outside the Phase E refactor scope. Frontend cleanup must not weaken owner checks, RLS assumptions or authenticated-only mutations.

The dedicated Security audit remains a required independent CI gate.

## Phase E changes

1. Remove the duplicate `audit:security` execution from the aggregate `npm run verify` chain.
2. Keep the standalone `npm run audit:security` command and `.github/workflows/security.yml` unchanged.
3. Record the above architectural stop rules so later cleanup does not restart broad refactoring without a concrete defect or measurable benefit.

## Stop rules after Phase E

The P3 refactoring program should be considered complete when all existing CI gates pass after this audit. Future cleanup should require at least one of the following:

- a reproducible defect;
- measurable performance degradation;
- an accessibility regression;
- duplicated logic with the same ownership and failure semantics;
- a security or data-integrity concern;
- a maintenance change that demonstrably becomes simpler after consolidation.

File count, line count and visual similarity alone are not reasons for further refactoring.

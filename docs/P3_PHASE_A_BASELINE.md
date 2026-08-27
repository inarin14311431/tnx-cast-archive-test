# P3 Phase A Baseline

Baseline date: 2026-08-27
Baseline commit: `cfce4eedebf991da3ea539eb6f57d7667c2ac00e`

## Purpose

Phase A freezes the currently working verification state before CSS/JS/Supabase refactoring begins. No application behavior or layout is intentionally changed in this phase.

## Existing visual baselines

The current Visual Regression suite captures both desktop (1440x1000) and iPhone 13 class mobile (390x844) views for the `nova` and `spectrum-neon` themes where applicable.

Currently protected by reference screenshots:

- Login
- Cast archive
- Cast viewer (desktop/mobile)
- Troop management
- Troop viewer
- PC editor (desktop)

Reference screenshots are stored under `tests/visual/__screenshots__` and compared by `.github/workflows/visual-regression.yml`.

## Critical P3 surfaces

The following are considered critical operational surfaces during P3. They must not regress while refactoring proceeds:

| Surface | Current visual baseline | Functional/E2E emphasis during P3 |
| --- | --- | --- |
| Login / logout | Yes | Auth session and redirect |
| Cast archive | Yes | Search/filter/paging |
| Cast viewer | Yes | PC/mobile layout |
| PC editor | Desktop | Load/edit/save |
| Mobile editor | Not yet visualized | Load/edit/save and overflow |
| Account | Not yet visualized | Owned casts/navigation |
| Act management | Not yet visualized | Detail/open/add/delete |
| Experience spending | Not yet visualized | Add/delete/confirmation/mobile |
| Act showcase generator | Not yet visualized | Cast loading/generation/publish |
| Troops | Yes | Manage/view |

The absence of a reference screenshot does not mean a surface may change freely. Until a stable deterministic fixture is available, existing E2E/contract tests and current production-like behavior are the baseline.

## Baseline rules for Phase B-D

1. Do not run `visual:update` merely to make a failing change pass.
2. A visual baseline update must correspond to an intentional UI change, not a refactor-only change.
3. Refactor PRs should keep Visual Regression, Playwright E2E, Regression checks, Quality gates, and Security audit green.
4. Optional/decoration JavaScript must not block core data loading, saving, deleting, or publishing.
5. Desktop and mobile behavior are both release criteria for account, acts, experience, and showcase features.
6. Loading states must resolve to success, empty, or explicit error; indefinite loading is a regression.

## Phase A result

The commit listed above is the reference point for P3 audits. Phase B may inspect CSS, JavaScript dependency structure, Supabase access patterns, test overlap, mobile behavior, and error handling, but should not perform broad cleanup until findings are documented.

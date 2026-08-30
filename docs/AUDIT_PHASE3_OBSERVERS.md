# Phase 3 MutationObserver audit

## Scope

Phase 3 reviews runtime `MutationObserver` ownership without changing the validation environment's intended appearance or behavior.

The inventory started at **60 JavaScript modules**. Cleanup removed redundant observers, replaced controlled render-completion observers with producer-owned events, narrowed broad document/page observers to component-owned roots, and removed dead observer modules. The current inventory is **48 modules**.

A lower count is not the goal by itself. A narrow observer that watches a DOM region owned by its module is preferable to recurring polling or a fragile timing assumption.

## Completion policy

Phase 3 is complete when all of the following remain true:

- every module constructing `MutationObserver` is present in `runtime-observer-manifest.json`;
- manifest entries are not stale;
- document/body-wide observation is rejected unless explicitly reviewed and documented;
- controlled render completion uses producer-owned events when practical;
- duplicate observers for the same producer-owned render lifecycle are removed;
- one-time readiness observers disconnect after their condition is met;
- scoped component observers remain allowed where DOM mutation is the actual source of truth;
- observer removal must not be replaced with recurring polling merely to reduce the inventory count;
- regression, security, quality, E2E, and visual-regression checks remain green.

## Reviewed broad-root exceptions

Three broad-root observers remain after the final review:

- `js/theme-scope.js`: shared theme infrastructure intentionally normalizes page content plus dialogs/fragments inserted by independent modules. This is the only persistent body-wide observer exception.
- `js/sheet-master-search-bs-tooltips.js`: its broad observer exists only as a one-time readiness fallback for the master-search dialog, which another module appends directly to `body`; it disconnects immediately after `#master-search-results` is available. The ongoing result observer is scoped to that results container.
- `js/sheet-master-search-filters.js`: likewise uses a broad observer only as a one-time readiness fallback for the separately-created master-search dialog and disconnects as soon as pagination can bind. The ongoing pagination observer is scoped to the results container.

These exceptions are enforced by `tests/runtime-observer-scope.test.mjs`. If an exception no longer observes a broad root, its allowlist entry must be removed. Any new broad observer fails the regression contract until it receives an explicit review and rationale.

## Remaining observer categories

The remaining inventory is intentional and falls into these ownership categories:

- component render synchronization, such as combo, skill, outfit, and cast sections;
- one-time readiness/visibility synchronization for asynchronously populated cast UI;
- editor field and master-data synchronization where mutations originate from multiple independent controls;
- layout/presentation synchronization for owned dynamic regions;
- shared theme normalization (`theme-scope.js`, explicitly excepted above).

These observers are not considered Phase 3 debt solely because they remain in the inventory. Future changes should prefer explicit producer events when a single producer owns the render lifecycle, while retaining MutationObserver where DOM mutation itself is the correct integration boundary.

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

## Reviewed broad-root exception

`js/theme-scope.js` is the single reviewed body-wide exception. Theme normalization intentionally covers page content plus dynamically inserted dialogs/fragments that can be created by independent feature modules. Restricting it to one component root would leave those injected surfaces outside theme normalization. Its observer is therefore treated as shared theme infrastructure rather than component-local rendering logic.

The exception is enforced by `tests/runtime-observer-scope.test.mjs`; if this module stops observing a broad root, the allowlist must be removed.

## Remaining observer categories

The remaining inventory is intentional and falls into these ownership categories:

- component render synchronization, such as combo, skill, outfit, and cast sections;
- one-time readiness/visibility synchronization for asynchronously populated cast UI;
- editor field and master-data synchronization where mutations originate from multiple independent controls;
- layout/presentation synchronization for owned dynamic regions;
- shared theme normalization (`theme-scope.js`, explicitly excepted above).

These observers are not considered Phase 3 debt solely because they remain in the inventory. Future changes should prefer explicit producer events when a single producer owns the render lifecycle, while retaining MutationObserver where DOM mutation itself is the correct integration boundary.

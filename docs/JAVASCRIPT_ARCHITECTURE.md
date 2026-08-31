# JavaScript Architecture

## Goal

The browser runtime is organized around explicit responsibility boundaries rather than post-render fixes. New features should extend an existing owner whenever possible instead of adding another document-wide observer or corrective module.

## Layers

1. **Page composition root** — `cast-app.js` and `sheet-app.js` declare page ownership and lifecycle contracts.
2. **Interaction / controller** — translates user actions into semantic operations.
3. **State / domain** — owns editor state and game/application rules without DOM dependencies where practical.
4. **Projection / normalization** — converts legacy or persistence-shaped records into canonical current models.
5. **Persistence** — owns Supabase reads/writes and transactional boundaries.
6. **Presentation / renderer** — creates or updates DOM from canonical state.
7. **Compatibility adapter** — reads legacy input only; current saves must not re-emit retired fields.

## Composition roots

`theme-scope.js` starts the page composition root early from the page pathname. The roots do not replace legacy classic-script loading in one step; they establish the canonical ownership contract first so migration can happen without changing runtime order.

- `cast-app.js`: cast viewer composition and DOM owners.
- `sheet-app.js`: classic editor composition and DOM owners.

Static legacy entry points may remain during migration, but new page-wide orchestration belongs in the composition root.

## DOM ownership

A dynamic region must have one semantic owner. Other modules may consume explicit lifecycle events or public APIs, but should not infer application state from unrelated DOM text/attributes.

Rules:

- Do not add a second renderer for the same region.
- Do not poll or observe `document` when an owned root or explicit event exists.
- MutationObserver is reserved for genuinely external/dynamic DOM boundaries and must be scoped to the smallest owned root.
- Post-render enhancement should prefer an explicit completion event.
- Save state must come from the shared save-state/coordinator API rather than parsing button text/classes.

Composition roots annotate major regions with `data-runtime-owner` for diagnostics; this metadata is descriptive and must not become application state.

## Event contracts

Canonical event names live in `js/app-events.js`. Module code should import these constants when it is already an ES module. Classic compatibility scripts may retain literals until converted, but new event names must be registered centrally first.

Event payloads must be stable objects and should contain application data, not raw DOM nodes unless the event is strictly presentation-scoped.

## Compatibility policy

Compatibility code belongs at input/load/import boundaries. It may accept retired aliases, but canonical models and persistence projections must use current fields only. See `LEGACY_COMPATIBILITY.md`.

## Naming

Runtime filenames describe responsibility, not implementation age. Versioned historical names are compatibility entry points only. Canonical examples:

- `sheet-skill-ui.js` (formerly `ui-v25.js`)
- `sheet-multiline-fields.js` (formerly `sheet-multiline-fields-v3.js`)

New runtime files must not use `-vN`, `fix`, `patch`, or `new` as responsibility names.

## Dependency rules

- Local JavaScript imports must resolve.
- Retired runtime modules must not be imported.
- **Module cycles are CI failures.** A cycle is not an accepted warning state.
- Pure/domain helpers should stay DOM-free.
- Persistence modules should not import presentation modules.

## Testing policy

Source-level architecture tests are appropriate for hard invariants such as ownership, forbidden dependencies, compatibility output, observer scope, and composition-root presence. User-visible behavior belongs primarily in unit/E2E/visual tests. Avoid locking incidental implementation syntax when behavior or an API contract can be tested instead.

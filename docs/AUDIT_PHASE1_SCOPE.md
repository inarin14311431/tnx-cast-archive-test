# Audit Phase 1 — Coverage corrections

This phase corrects audit coverage before any CSS restructuring.

## Scope

1. Remove stale runtime-style exemptions. Runtime `<style>` generation is prohibited for all current JavaScript modules.
2. Inventory every module that constructs a `MutationObserver` in `runtime-observer-manifest.json`. The initial baseline contains 60 modules. A manifest entry records current ownership only; it is not a performance approval. New observer modules must update the audit inventory deliberately.
3. Bring the standalone ACT showcase stylesheet family into static audit coverage without changing its rendered appearance. Unowned legacy showcase stylesheets are removed when they are not linked by the runtime page.

No user-facing behavior or visual design is intentionally changed in this phase.

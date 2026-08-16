# Sheet editor runtime architecture

This document defines the safe refactoring boundary for `sheet.html`.

## Current rule

`js/sheet.js` remains the editor core. Existing enhancement modules continue to load in their current order. Phase 5 refactoring must not change data mapping, save timing, DOM ids, or user-visible behavior unless a separate change explicitly requires it.

## Responsibility groups

- Core state / load / save: `js/sheet.js`
- Editor navigation and sidebar actions: `js/sheet-sidebar-actions.js`
- Character Sheets URL import: `js/sheet-import-url.js`
- Snapshots / recovery: `js/sheet-snapshots.js`
- Style skill presentation and compatibility: `js/style-skill-*.js`, `js/sheet-import-style-skill-compat.js`
- Master search and autofill: `js/sheet-master-search*.js`, `js/sheet-master-autofill.js`
- Outfit helpers and master data: `js/outfit-*.js`
- Combo / counter editor: sheet combo-related modules

## Refactoring sequence

1. Freeze and audit the current script graph.
2. Identify modules that modify the same DOM nodes or register overlapping handlers.
3. Move one responsibility at a time behind an explicit initializer without changing output.
4. Run regression and Playwright checks after every responsibility move.
5. Only after behavior is stable, reduce script count or merge modules.

## Safety contracts

- `js/sheet.js` is loaded exactly once.
- Local script references must exist and must not be duplicated.
- Core-dependent editor modules must not move before `js/sheet.js` without an explicit migration.
- Existing element ids and persisted data shape are compatibility contracts.
- Refactoring commits should avoid simultaneous CSS/layout changes.
- A failed runtime audit blocks the refactor before browser deployment.

The automated baseline for these rules is `scripts/audit-sheet-runtime.mjs`.

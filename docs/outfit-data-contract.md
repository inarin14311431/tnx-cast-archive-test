# Outfit data contract

This document defines the canonical outfit data semantics shared by editor, mobile editor, public view, import, and transfer code.

## Common fields

All categories share these user-facing fields:

- `name` — 名称
- `purchase_value` — 購入
- `experience_cost` — 常備化
- `concealment` — 隠匿値 only
- `ofc_details.concealment_penalty` — 隠匿修正
- `slot` — 部位
- `description` — 解説
- `ofc_details.page_number` — 参照P

Legacy combined concealment such as `12/-1` may be read for compatibility. Current editors save value and modifier separately.

## Category-specific performance fields

The authoritative field list and user-facing labels are `js/outfit-contract.js`.

- weapon: attack, parry, range, speed, electronic_control
- armor: defense_s, defense_p, defense_i, control_modifier, electronic_control
- cyberware: electronic_control, ianus_surface, ianus_deep, ianus_none
- tron: electronic_control, speed, tron_software, tron_support, tron_hardware, cs_modifier
- vehicle: attack, speed, control_modifier, cs_modifier, electronic_control, defense_s, defense_p, defense_i, crew, sf
- residence: speed, electronic_control, residence_entry, residence_electric, residence_area
- other: electronic_control

`outfitCanonicalFields(category)` composes category + common base fields + category-specific performance fields + description fields. Consumers should derive from this contract rather than recreate semantic field lists where practical.

## Control and CS

- `control_modifier` is the canonical stored field displayed as 制御値 and is valid only for armor and vehicle.
- `cs_modifier` is the canonical stored field displayed as CS修正 and is valid only for tron and vehicle.
- `ofc_details.control_value` and `ofc_details.cs_value` are legacy read-only compatibility aliases. Current editors must not create blank/new copies of them.
- `mundane_modifier` is not a user-facing outfit field and is intentionally absent from canonical field labels.

## Ownership

- `js/outfit-contract.js` owns category semantics, canonical field grouping, and canonical user-facing field labels.
- `js/outfit-view-model.js` owns shared read normalization for public views and outbound transfer adapters.
- `js/sheet-mobile-outfit-model.js` owns mobile editor persistence and uses the shared contract.
- `js/outfit-pc-field-policy.js` derives missing PC base fields and labels from the shared contract; it consumes `tnx:outfit-tables-rendered` rather than observing `#outfit-list` itself.
- `js/outfit-tables.js` owns raw-card-to-table transport, row ordering, and armor total presentation. Armor totals are calculated directly from canonical `data-ofc="defense_s|p|i"` controls; the table layer no longer synthesizes or mirrors a combined armor `defense` control.
- `js/sheet.js` owns the classic editor's in-memory raw outfit model and base bundle payload. New blank outfits no longer seed retired modifier fields, and `collectOutfits()` writes control/CS only for their canonical categories. Some legacy raw source fields remain temporarily in this module, but final persistence is constrained by `outfit-ofc-save.js`.
- `js/outfit-display-rules-v5.js` owns final PC column visibility/order while the classic table transport remains in place. It no longer mirrors armor S/P/I into a legacy defense backing field.
- `js/outfit-ofc-fields.js` owns active PC armor S/P/I state. A legacy combined armor `defense` value is parsed only when loading a row that has no structured S/P/I values.
- `js/outfit-ofc-save.js` owns the final PC save enrichment boundary. Armor persists S/P/I in `ofc_details` and clears the retired base `defense` value; vehicle compatibility may still compose the base `defense` column.
- `js/tnx-direct-transfer-data.js` owns Character Sheets field-name translation only. Concealment splitting, defense S/P/I parsing, category normalization, control constraints, and normalized OFC detail values come from `normalizeOutfitForView()` instead of a transfer-local normalizer.
- `js/outfit-ofc-adapter.js` owns OFC master/TSV alias normalization and shared category constraints before values are applied to editor controls.
- `js/sheet-import-outfit-compat.js` is the only legacy outfit reconstruction owner; it delegates control/CS category semantics to `outfit-ofc-adapter.js` rather than maintaining its own category lists.
- `js/sheet-import.js` imports profile, styles, abilities, and skills only; it must not reconstruct outfits.

## Raw table compatibility boundary

`js/outfit-tables.js` is still a classic script and therefore does not yet import `outfit-contract.js` directly. Its local names intentionally distinguish transport from semantics:

- `RAW_CARD_SCHEMAS` now lists only base controls that participate in the classic table presentation. It is not a persistence schema or canonical semantic schema.
- `BASE_LABELS` uses current display terminology for those base controls.
- Before presentation conversion, `captureCardData()` records every source-card `[data-o]` value. `readRow()` overlays live visible values on that snapshot before a reorder rebuild.
- Because reorder persistence is independent of visible cells, `mundane_modifier`, category-invalid `control_modifier` / `cs_modifier`, vehicle `defense`, and armor defense component cells are not rendered by `RAW_CARD_SCHEMAS`.
- Armor S/P/I are injected and restored by `outfit-ofc-fields.js`, so reorder reconstruction preserves them through the OFC detail snapshot rather than raw table backing controls.
- `sheet.js` still emits selected hidden raw compatibility controls for retired values so old non-zero/non-empty data can survive a reorder rebuild without becoming user-editable.

The generic base `defense` field is no longer an active PC armor field. For armor, old combined `defense` is read-only compatibility: it may initialize S/P/I when structured values are absent, but editing, totals, reorder state, and final persistence all use structured S/P/I. Current PC saves clear armor's base `defense` value. Vehicle still has a compatibility use for the base `defense` column and is handled separately.

## Classic sheet save boundary

`js/sheet.js` now distinguishes current writes from compatibility preservation, while `js/outfit-ofc-save.js` enforces the final canonical persistence shape:

- `blankOutfit()` does not seed `defense`, `control_modifier`, `cs_modifier`, or `mundane_modifier`.
- The raw editor exposes `control_modifier` only for armor/vehicle and `cs_modifier` only for tron/vehicle.
- Vehicle no longer exposes the generic `defense` field; a hidden compatibility control exists only as transport backing.
- The classic source still contains an armor `defense` raw field during this transition, but `outfit-tables.js` no longer renders or reads it as an active armor field.
- `outfit-ofc-save.js` clears armor `defense` and persists canonical `defense_s`, `defense_p`, and `defense_i` in `ofc_details`.
- `legacyOutfitSaveFields()` carries forward only meaningful legacy values such as vehicle `defense`, non-zero `mundane_modifier`, and non-zero category-invalid control/CS values.
- The database schema/RPC still contains legacy columns for compatibility. This phase changes client generation and payload ownership; it does not remove DB columns or bulk-migrate existing records.

## Transfer adapter boundary

`js/tnx-direct-transfer-data.js` now receives canonical normalized outfit data from `js/outfit-view-model.js` before translating it to Character Sheets keys.

- It no longer owns a separate concealment parser.
- It no longer owns a separate S/P/I defense parser.
- It no longer owns a separate outfit/category normalizer.
- Character Sheets-specific keys such as `concealA`, `concealB`, `protecS`, `protecP`, `protecI`, and `electrical_control` remain adapter responsibilities.
- Parsing old label-prefixed lines from descriptions remains transfer compatibility behavior for now; it is not promoted into the canonical model.

## OFC import adapter boundary

`js/outfit-ofc-adapter.js` is the shared semantic boundary for OFC master rows, OFC TSV rows, and legacy Character Sheets outfit reconstruction before editor application.

- The OFC database may still expose `control_value`; the adapter converts it to canonical `control_modifier`.
- Old TSVs may still contain `control_value` or `cs_value`; the adapter accepts them as read compatibility and removes those aliases from the normalized result.
- Control is retained only for armor/vehicle; CS修正 is retained only for tron/vehicle.
- `js/outfit-ofc-master-apply.js` and `js/outfit-ofc-tsv.js` no longer each own duplicate master-row semantic mapping.
- `js/sheet-import-outfit-compat.js` maps legacy field names to canonical modifier names, then delegates category validity to the same adapter. It no longer hardcodes armor/vehicle and tron/vehicle category lists for control/CS.
- The external TSV header `control_value` is retained for existing copied TSV compatibility. Internally it is immediately normalized to `control_modifier`.

## Compatibility rule

Legacy formats may be read, but new/current saves must use canonical fields. Compatibility code must not infer nonexistent fields or reintroduce retired aliases into new records.

## Refactor sequence

1. Keep Regression and Playwright green.
2. Remove duplicate legacy outfit reconstruction from the base importer.
3. Move category, field semantics, and labels into `js/outfit-contract.js`.
4. Migrate one consumer at a time to the shared contract with dedicated regression coverage.
5. Distinguish `outfit-tables.js` raw transport schemas from canonical semantics without changing save/reorder behavior.
6. Decouple reorder reconstruction from visible DOM fields and remove compatibility-only table controls.
7. Separate `sheet.js` current outfit writes from legacy compatibility preservation.
8. Migrate outbound transfer normalization to the shared outfit view model.
9. Consolidate OFC master/TSV semantic normalization in one adapter.
10. Route legacy Character Sheets outfit modifier constraints through the same adapter.
11. Make armor S/P/I the sole active PC defense fields and retire the table/display backing bridge.
12. Remove remaining stale classic-source compatibility fields only after final persistence and import coverage is green.

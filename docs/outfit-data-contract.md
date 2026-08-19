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
- `js/outfit-view-model.js` owns normalization for read-only public views.
- `js/sheet-mobile-outfit-model.js` owns mobile editor persistence and uses the shared contract.
- `js/outfit-pc-field-policy.js` derives missing PC base fields and labels from the shared contract; it consumes `tnx:outfit-tables-rendered` rather than observing `#outfit-list` itself.
- `js/outfit-tables.js` owns raw-card-to-table transport, row ordering, and armor total presentation. It captures the complete raw `[data-o]` card state before controls are moved into presentation cells, so reorder reconstruction no longer depends on which fields are visible in the table.
- `js/sheet.js` owns the classic editor's in-memory raw outfit model and base bundle payload. New blank outfits no longer seed retired modifier fields, and `collectOutfits()` writes control/CS only for their canonical categories. Meaningful legacy values are emitted only through an explicit compatibility path.
- `js/outfit-display-rules-v5.js` owns final PC column visibility/order while the classic table transport remains in place.
- `js/sheet-import-outfit-compat.js` is the only legacy outfit reconstruction owner.
- `js/sheet-import.js` imports profile, styles, abilities, and skills only; it must not reconstruct outfits.

## Raw table compatibility boundary

`js/outfit-tables.js` is still a classic script and therefore does not yet import `outfit-contract.js` directly. Its local names intentionally distinguish transport from semantics:

- `RAW_CARD_SCHEMAS` now lists only base controls that participate in the classic table presentation. It is not a persistence schema or canonical semantic schema.
- `BASE_LABELS` uses current display terminology for those base controls.
- Before presentation conversion, `captureCardData()` records every source-card `[data-o]` value. `readRow()` overlays live visible values on that snapshot before a reorder rebuild.
- Because reorder persistence is independent of visible cells, `mundane_modifier`, category-invalid `control_modifier` / `cs_modifier`, and legacy vehicle `defense` cells are no longer rendered by `RAW_CARD_SCHEMAS`.
- `sheet.js` still emits hidden raw compatibility controls for retired values so old non-zero/non-empty data can survive a reorder rebuild without becoming user-editable.

The generic base `defense` field is no longer part of vehicle table presentation. Vehicle defense is canonically represented by `defense_s`, `defense_p`, and `defense_i`. The old `vehicle.defense` value is preserved only when it is meaningful legacy data. Armor still uses its legacy base `defense` backing control internally to split and synchronize S/I/P fields until that armor compatibility path is migrated separately.

## Classic sheet save boundary

`js/sheet.js` now distinguishes current writes from compatibility preservation:

- `blankOutfit()` does not seed `defense`, `control_modifier`, `cs_modifier`, or `mundane_modifier`.
- The raw editor exposes `control_modifier` only for armor/vehicle and `cs_modifier` only for tron/vehicle.
- Vehicle no longer exposes the generic `defense` field; a hidden compatibility control exists only as transport backing.
- `collectOutfits()` emits canonical category fields only.
- `legacyOutfitSaveFields()` carries forward only meaningful legacy values: non-empty vehicle `defense`, non-zero `mundane_modifier`, and non-zero category-invalid control/CS values.
- The database schema/RPC still contains legacy columns for compatibility. This phase changes client generation and payload ownership; it does not remove DB columns or bulk-migrate existing records.

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
8. Reduce remaining compatibility duplication in transfer/import adapters.
9. Retire legacy backing controls only after their save/import compatibility paths have dedicated coverage.

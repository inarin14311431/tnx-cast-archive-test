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
- `js/outfit-tables.js` owns raw-card-to-table transport, row ordering, and armor total presentation. Its `RAW_CARD_SCHEMAS` are compatibility transport schemas, not canonical semantic schemas. Compatibility-only controls may remain there temporarily so reorder rebuilds do not discard stored values.
- `js/outfit-display-rules-v5.js` owns final PC column visibility/order while the classic table transport remains in place.
- `js/sheet-import-outfit-compat.js` is the only legacy outfit reconstruction owner.
- `js/sheet-import.js` imports profile, styles, abilities, and skills only; it must not reconstruct outfits.

## Raw table compatibility boundary

`js/outfit-tables.js` is still a classic script and therefore does not yet import `outfit-contract.js` directly. Its local names intentionally distinguish transport from semantics:

- `RAW_CARD_SCHEMAS` lists controls that must survive raw-card transformation and reorder rebuilds.
- `BASE_LABELS` uses current display terminology for any base control that can become visible before the final layout controller runs.
- `mundane_modifier` may remain in `RAW_CARD_SCHEMAS` only as hidden compatibility transport; it has no user-facing label and is not part of the canonical outfit contract.

The next cleanup must first decouple reorder snapshots from visible table cells. Only after row rebuild can preserve complete model data independently may compatibility-only fields be removed from `RAW_CARD_SCHEMAS`.

## Compatibility rule

Legacy formats may be read, but new/current saves must use canonical fields. Compatibility code must not infer nonexistent fields or reintroduce retired aliases into new records.

## Refactor sequence

1. Keep Regression and Playwright green.
2. Remove duplicate legacy outfit reconstruction from the base importer.
3. Move category, field semantics, and labels into `js/outfit-contract.js`.
4. Migrate one consumer at a time to the shared contract with dedicated regression coverage.
5. Distinguish `outfit-tables.js` raw transport schemas from canonical semantics without changing save/reorder behavior.
6. Decouple reorder reconstruction from visible DOM fields, then remove compatibility-only table controls.
7. Only then reduce remaining compatibility duplication in transfer/import adapters.

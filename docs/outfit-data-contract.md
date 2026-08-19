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

The authoritative field list is `js/outfit-contract.js`.

- weapon: attack, parry, range, speed, electronic_control
- armor: defense_s, defense_p, defense_i, control_modifier, electronic_control
- cyberware: electronic_control, ianus_surface, ianus_deep, ianus_none
- tron: electronic_control, speed, tron_software, tron_support, tron_hardware, cs_modifier
- vehicle: attack, speed, control_modifier, cs_modifier, electronic_control, defense_s, defense_p, defense_i, crew, sf
- residence: speed, electronic_control, residence_entry, residence_electric, residence_area
- other: electronic_control

## Control and CS

- `control_modifier` is the canonical stored field displayed as 制御値 and is valid only for armor and vehicle.
- `cs_modifier` is the canonical stored field displayed as CS修正 and is valid only for tron and vehicle.
- `ofc_details.control_value` and `ofc_details.cs_value` are legacy read-only compatibility aliases. Current editors must not create blank/new copies of them.
- `mundane_modifier` is not a user-facing outfit field.

## Ownership

- `js/outfit-contract.js` owns category/field semantics.
- `js/outfit-view-model.js` owns normalization for read-only public views.
- `js/sheet-mobile-outfit-model.js` owns mobile editor persistence and uses the shared contract.
- `js/sheet-import-outfit-compat.js` is the only legacy outfit reconstruction owner.
- `js/sheet-import.js` imports profile, styles, abilities, and skills only; it must not reconstruct outfits.

## Compatibility rule

Legacy formats may be read, but new/current saves must use canonical fields. Compatibility code must not infer nonexistent fields or reintroduce retired aliases into new records.

## Refactor sequence

1. Keep Regression and Playwright green.
2. Remove duplicate legacy outfit reconstruction from the base importer.
3. Move category and field semantics into `js/outfit-contract.js`.
4. Migrate one consumer at a time to the shared contract with dedicated regression coverage.
5. Only then reduce remaining compatibility duplication in transfer/import adapters.

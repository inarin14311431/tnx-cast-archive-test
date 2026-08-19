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

Legacy combined concealment such as `12/-1` may be read at an explicit compatibility boundary. Current editors save value and modifier separately.

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
- `ofc_details.control_value` and `ofc_details.cs_value` are legacy input aliases only. Explicit import adapters may consume them, but current editor state and saves must not regenerate them.
- `mundane_modifier` is not an outfit field and is absent from the canonical contract and current save paths.

## Defense

- Armor and vehicle defense values are canonical only as `ofc_details.defense_s`, `ofc_details.defense_p`, and `ofc_details.defense_i`.
- The old combined base `defense` value is retired from current editor state, current saves, current OFC TSV application, and legacy Character Sheets reconstruction.
- Existing database rows were converted before the read fallback was retired. Current DB-backed PC editing reads structured `ofc_details` directly.
- Old external input may still contain a combined defense string. An explicit import adapter may parse it once into S/P/I, but it must not persist or recreate the combined value.

## Ownership

- `js/outfit-contract.js` owns category semantics, canonical field grouping, labels, and legacy-detail normalization rules.
- `js/outfit-view-model.js` owns shared read normalization for public views and outbound transfer adapters.
- `js/sheet-mobile-outfit-model.js` owns mobile editor outfit persistence and uses the shared contract.
- `js/outfit-pc-field-policy.js` derives PC field presentation from the shared contract.
- `js/outfit-tables.js` owns raw-card-to-table presentation, row ordering, and armor total presentation. Armor totals read canonical S/P/I controls directly.
- `js/outfit-ofc-fields.js` owns active PC OFC detail state and loads `ofc_details` without reconstructing data from old stored `description` or combined `defense` fields.
- `js/sheet.js` owns the classic editor's in-memory raw outfit model and base bundle payload. It no longer emits hidden legacy outfit transport controls, no longer exposes base armor `defense`, and no longer has `legacyOutfitSaveFields()`.
- `js/outfit-ofc-save.js` owns the final PC save enrichment boundary. It canonicalizes `ofc_details`, enforces category ownership for control/CS, and does not regenerate combined `defense` or `mundane_modifier`.
- `js/outfit-ofc-adapter.js` owns OFC master/TSV alias normalization and shared category constraints before values reach editor controls.
- `js/outfit-ofc-tsv.js` applies structured OFC TSV details. A legacy TSV `defense` cell is parsed to S/P/I before application; the classic `sheet.js` fallback no longer seeds base `defense`.
- `js/sheet-import-outfit-compat.js` is the only legacy Character Sheets outfit reconstruction owner. It converts legacy field names into current controls and no longer rebuilds combined `defense`.
- `js/sheet-import.js` imports profile, styles, abilities, and skills only; it must not reconstruct outfits.
- `js/tnx-direct-transfer-data.js` owns Character Sheets field-name translation only; semantic normalization comes from the shared outfit view model.

## Classic sheet boundary

The classic PC editor now carries only current raw fields needed by its UI and bundle collection:

- `blankOutfit()` does not seed `defense`, `control_modifier`, `cs_modifier`, or `mundane_modifier`.
- `outfitFields()` exposes `control_modifier` only for armor/vehicle and `cs_modifier` only for tron/vehicle.
- `outfitFields()` has no `data-o="defense"` and no hidden retired transport fields.
- `collectOutfits()` writes only category-owned current fields. It does not call a legacy-preservation helper and does not write combined `defense` or `mundane_modifier`.
- The old generic OFC TSV fallback in `sheet.js` no longer seeds `row.defense`; structured details are handled by `outfit-ofc-tsv.js`.
- Database schema/RPC definitions may still contain historical columns for compatibility. Removing current client generation does not imply those physical columns were dropped.

## Transfer adapter boundary

`js/tnx-direct-transfer-data.js` receives canonical normalized outfit data from `js/outfit-view-model.js` before translating it to Character Sheets keys.

- It does not own a separate concealment parser.
- It does not own a separate S/P/I defense parser.
- It does not own a separate outfit/category normalizer.
- Character Sheets-specific keys such as `concealA`, `concealB`, `protecS`, `protecP`, `protecI`, and `electrical_control` remain adapter responsibilities.

## OFC import adapter boundary

`js/outfit-ofc-adapter.js` is the shared semantic boundary for OFC master rows, OFC TSV rows, and legacy Character Sheets outfit reconstruction before editor application.

- OFC source data may still expose `control_value`; the adapter converts it to canonical `control_modifier`.
- Old TSVs may still contain `control_value`, `cs_value`, or a combined defense cell; these are consumed as input compatibility and are not re-emitted as current state.
- Control is retained only for armor/vehicle; CS修正 is retained only for tron/vehicle.
- The external TSV header `control_value` remains for copied-TSV compatibility. Internally it is normalized immediately.

## Compatibility rule

Legacy formats may be read only at explicit compatibility boundaries. New/current editor state, imports after normalization, and saves must use canonical fields and must not reintroduce retired aliases or combined defense values.

## Refactor sequence

1. Keep Regression and Playwright green.
2. Remove duplicate legacy outfit reconstruction from the base importer.
3. Move category and field semantics into `js/outfit-contract.js`.
4. Consolidate view, transfer, OFC master/TSV, and legacy-import normalization on shared boundaries.
5. Make S/P/I the sole active armor/vehicle defense representation.
6. Convert existing DB rows and establish a zero-legacy data boundary.
7. Retire stored-row reconstruction from legacy columns/descriptions.
8. Retire classic `sheet.js` hidden compatibility transport and legacy save preservation.
9. Keep only explicit external-input compatibility adapters until those source formats themselves are retired.

# Outfit defense migration boundary

Armor and vehicle defense now use `defense_s`, `defense_p`, and `defense_i` in `ofc_details` as the canonical representation.

## Current ownership

- `js/outfit-ofc-fields.js` owns the editable S/P/I controls for supported outfit categories.
- `js/outfit-display-rules-v5.js` presents those canonical controls in the PC editor.
- `js/outfit-tables.js` calculates armor totals from canonical S/P/I controls.
- `js/outfit-ofc-save.js` clears the legacy combined `character_outfits.defense` value on save and persists structured S/P/I through `ofc_details`.

## Completed conversion

The remaining armor and vehicle rows that still carried a combined `defense` value were checked before cleanup. Every vehicle row with a combined value already had structured S/P/I data, and armor-only legacy rows were converted to structured values before their combined value was cleared.

The active database now has no non-empty combined `defense` values for armor or vehicle rows.

## Compatibility policy

Combined outfit `defense` is no longer an active save format. Current import and save paths must not recreate it. Any legacy parsing that remains elsewhere in the codebase is read-only compatibility and can be removed once its callers are retired.

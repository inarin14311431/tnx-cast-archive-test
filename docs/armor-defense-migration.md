# Armor defense migration boundary

Armor and vehicle defense values are canonical only as structured `defense_s`, `defense_p`, and `defense_i` values in `ofc_details`.

## Current ownership

- `js/outfit-ofc-fields.js` creates and restores editable S/P/I controls from `ofc_details` only.
- `js/outfit-display-rules-v5.js` presents those OFC controls as the visible S/P/I columns.
- `js/outfit-tables.js` calculates armor totals directly from the canonical OFC S/P/I controls.
- `js/outfit-ofc-save.js` clears the retired combined `character_outfits.defense` column for every category and never rebuilds it.

## Legacy state

The database conversion is complete. Current editor loading no longer parses `character_outfits.defense` or reconstructs OFC metadata from the base description field.

External import compatibility remains separate from stored-row loading. Legacy external source formats may still be accepted by dedicated import adapters, but they must normalize into the canonical outfit contract before entering editor state or save payloads.

## Guardrail

Regression tests verify that the PC editor does not reintroduce combined defense parsing, hidden armor defense backing controls, or combined defense save generation.

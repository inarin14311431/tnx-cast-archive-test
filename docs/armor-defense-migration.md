# Armor defense migration boundary

The PC editor now treats armor `defense_s`, `defense_p`, and `defense_i` as canonical OFC detail fields.

## Current ownership

- `js/outfit-ofc-fields.js` creates and persists the editable armor S/P/I controls.
- `js/outfit-display-rules-v5.js` presents those OFC controls as the visible armor S/P/I columns.
- `js/outfit-tables.js` still contains the legacy combined `defense` backing path only as a temporary compatibility mirror.

## Compatibility bridge

Existing rows may still contain the old combined `character_outfits.defense` value. `outfit-ofc-fields.js` reads it only when structured S/P/I values are absent. While the backing path remains, edits to canonical S/P/I controls are mirrored into the hidden legacy armor inputs so existing armor totals and old save compatibility continue to work.

The bridge is one-way in ownership terms: canonical OFC S/P/I values are preferred when collecting details; combined `defense` is fallback compatibility data.

## Next step

After Regression and authenticated editor E2E confirm the canonical S/P/I controls, remove the armor `defense` backing controls, parser/synchronizer, and base save write from the classic editor. Armor totals should then read canonical S/P/I controls directly.

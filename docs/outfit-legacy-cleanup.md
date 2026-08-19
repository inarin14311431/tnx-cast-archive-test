# Outfit legacy cleanup boundary

## Database state after 2026-08-19 cleanup

The shared `character_outfits` table has been normalized so that the following legacy residues are zero:

- non-zero `mundane_modifier`
- category-invalid base `control_modifier`
- category-invalid base `cs_modifier`
- armor combined base `defense`
- `ofc_details.control_value`
- `ofc_details.cs_value`
- `ofc_details.mundane_modifier`

Legacy armor rows that only had combined `defense` were promoted to `ofc_details.defense_s`, `defense_p`, and `defense_i` before the base value was cleared.

The cleanup is recorded as the idempotent SQL file `supabase/12_outfit_canonical_cleanup.sql`.

## Import policy

Legacy field names may still be accepted as input compatibility, but they are normalized immediately at the boundary:

- `control_value` -> `control_modifier` only for armor/vehicle
- `cs_value` -> `cs_modifier` only for tron/vehicle
- `mundane_modifier` is discarded

Current OFC master, TSV, Character Sheets import, PC save, and mobile save paths must not persist the retired aliases again.

Regression coverage in `tests/outfit-legacy-zero-boundary.test.mjs` locks this rule.

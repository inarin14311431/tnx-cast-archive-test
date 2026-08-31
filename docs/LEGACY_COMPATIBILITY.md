# Legacy Compatibility Register

Compatibility is an input boundary, not a second current data model. Retired fields may be read where required for old records/imports, but current save/export paths must not regenerate them.

| Area | Legacy input | Current owner | Output policy | Retirement condition |
| --- | --- | --- | --- | --- |
| Outfit concealment | combined concealment / legacy modifier aliases | shared outfit normalizer / OFC adapter | save split canonical value + modifier only | no stored records/import sources require aliases |
| Outfit defense | combined defense text / positional defense | shared legacy defense parser / OFC adapter | save structured S/P/I only | legacy imports and stored records migrated |
| Outfit modifiers | `mundane_modifier` and retired category aliases | shared OFC adapter | never emit retired modifier | no supported source contains the field |
| Style skill detail | legacy labeled description payloads | style detail compatibility/integrity modules | save canonical structured/current detail | supported legacy records migrated |
| Style separators | V1 separator representation | style skill normalization | save current separator representation | no supported records use V1 representation |
| Character Sheets import | legacy JSON/JSONP field aliases | import compatibility boundary | project into current editor model | external source contract no longer emits legacy fields |
| Historical runtime filenames | `ui-v25.js`, `sheet-multiline-fields-v3.js` | compatibility shim only | canonical implementation uses responsibility names | HTML/runtime references migrated to canonical entry names |

## Rules

1. Each new compatibility case must be added to this register.
2. Compatibility must have an explicit canonical owner and retirement condition.
3. Legacy fields are read-only compatibility unless a documented external contract requires otherwise.
4. Removal requires regression coverage proving old input is either migrated or intentionally unsupported.

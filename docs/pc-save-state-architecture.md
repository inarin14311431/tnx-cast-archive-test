# PC editor save-state ownership

The classic PC editor separates save orchestration, persistence, and save-state presentation.

`js/sheet-save-coordinator.js` owns producer-side save lifecycle mechanics:

- dirty / saving / pending state;
- queued repeat-save handling while a save is already running;
- validation gating;
- publishing explicit `unsaved`, `saving`, `saved`, and `error` transitions through `sheet-save-state.js`;
- publishing the raw failed save error through `tnx:sheet-save-error` before the public error-state transition;
- registering the canonical save command used by shared consumers.

`js/sheet-save-persistence.js` owns the transactional database save boundary:

- the `save_character_bundle` RPC name;
- the exact `p_character_id / p_character / p_skills / p_outfits` argument mapping;
- propagation of Supabase RPC errors;
- validation that the returned bundle contains both `id` and `public_id`.

`js/sheet.js` owns editor data collection and post-save editor integration. It supplies the coordinator with a `persist()` callback that collects the canonical character/skill/outfit payload, calls `persistSheetBundle()`, updates the current character/public ID, rewrites the editor URL, and publishes `tnx:character-saved`. It no longer calls `save_character_bundle` directly.

`js/sheet-save-state.js` is the single presentation/consumer bridge for save state.

Responsibilities:

- hold the explicit current state and status text;
- render `#save-status` and the matching `#save-button` state and label from that state;
- publish `tnx:sheet-save-state` when the state changes;
- expose `TNXSheetSaveState` plus module helpers for consumers that need to query dirty state, request a save, wait for completion, or focus the save button;
- route `requestSheetSave()` through the save requester registered by the coordinator instead of synthesizing a click on `#save-button`.

Consumers must not parse `#save-status` text/classes, click the save button as a command transport, or duplicate the save-button presentation mapping.

Current consumers:

- `sheet-snapshots.js` uses the shared bridge for its unsaved guard and save-button focus.
- `sheet-image.js` uses `requestSheetSave()` + `waitForSheetSaved()` while bootstrapping the first save before image upload. The request reaches the coordinator directly rather than depending on button DOM.
- `sheet-save-diagnostics.js` listens to `tnx:sheet-save-state` for lifecycle and `tnx:sheet-save-error` for the structured DB error. It does not observe `#save-status`, import the Supabase client, or monkey-patch `supabase.rpc`.
- `sheet-features.js` has no independent save-state observer.

The former `sheet-save-watchdog.js` has been removed from the repository. Its historic autosave timer interception, timer monkey-patching, duplicate unsaved-state parser, and duplicate `beforeunload` listener are retired.

Current ownership boundary:

- `sheet-save-coordinator.js`: save lifecycle state, queued save mechanics, structured failure publication, and canonical save-command registration;
- `sheet-save-persistence.js`: transactional character/skill/outfit RPC persistence;
- `sheet.js`: canonical editor payload collection plus post-save URL/event integration;
- `sheet-save-state.js`: explicit state store, presentation, and consumer API;
- `sheet-save-diagnostics.js`: diagnostic interpretation only, with no persistence interception.

The next safe extraction target is the editor-side payload collection boundary. Any further split should preserve the current canonical character, skill, and outfit payload contracts rather than moving DOM ownership into persistence code.

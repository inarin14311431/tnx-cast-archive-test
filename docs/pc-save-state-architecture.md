# PC editor save-state ownership

The classic PC editor separates save orchestration from save-state presentation.

`js/sheet-save-coordinator.js` owns producer-side save lifecycle mechanics:

- dirty / saving / pending state;
- queued repeat-save handling while a save is already running;
- validation gating;
- publishing explicit `unsaved`, `saving`, `saved`, and `error` transitions through `sheet-save-state.js`;
- publishing the raw failed save error through `tnx:sheet-save-error` before the public error-state transition.

`js/sheet.js` owns editor data collection and the transactional persistence boundary. It supplies the coordinator with a `persist()` callback that calls `save_character_bundle`, updates the current character/public ID, rewrites the editor URL, and publishes `tnx:character-saved`.

`js/sheet-save-state.js` is the single presentation/consumer bridge for save state.

Responsibilities:

- hold the explicit current state and status text;
- render `#save-status` and the matching `#save-button` state and label from that state;
- publish `tnx:sheet-save-state` when the state changes;
- expose `TNXSheetSaveState` plus module helpers for consumers that need to query dirty state, request a save, wait for completion, or focus the save button.

Consumers must not parse `#save-status` text/classes or duplicate the save-button presentation mapping.

Current consumers:

- `sheet-snapshots.js` uses the shared bridge for its unsaved guard and save-button focus.
- `sheet-image.js` uses `requestSheetSave()` + `waitForSheetSaved()` while bootstrapping the first save before image upload.
- `sheet-save-diagnostics.js` listens to `tnx:sheet-save-state` for lifecycle and `tnx:sheet-save-error` for the structured DB error. It no longer observes `#save-status`, imports the Supabase client, or monkey-patches `supabase.rpc`.
- `sheet-features.js` has no independent save-state observer.

The former `sheet-save-watchdog.js` has been removed from the repository. Its historic autosave timer interception, timer monkey-patching, duplicate unsaved-state parser, and duplicate `beforeunload` listener are retired.

Current ownership boundary:

- `sheet-save-coordinator.js`: save lifecycle state, queued save mechanics, and structured failure publication;
- `sheet.js`: canonical editor payload collection and transactional persistence callback;
- `sheet-save-state.js`: explicit state store, presentation, and consumer API;
- `sheet-save-diagnostics.js`: diagnostic interpretation only, with no persistence interception.

The next extraction target is the persistence callback itself. It can move after this boundary remains green, preserving the transactional character/skill/outfit bundle contract and the `tnx:character-saved` integration event.

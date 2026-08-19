# PC editor save-state ownership

The classic PC editor now separates save orchestration from save-state presentation.

`js/sheet-save-coordinator.js` owns producer-side save lifecycle mechanics:

- dirty / saving / pending state;
- queued repeat-save handling while a save is already running;
- validation gating;
- writing the source `#save-status` text/class;
- loading, saved, unsaved, and error transitions.

`js/sheet.js` owns editor data collection and the transactional persistence boundary. It supplies the coordinator with a `persist()` callback that calls `save_character_bundle`, updates the current character/public ID, rewrites the editor URL, and publishes `tnx:character-saved`.

`js/sheet-save-state.js` is the single presentation/consumer bridge for save state.

Responsibilities:

- interpret `#save-status` as `unsaved`, `saving`, `saved`, or `error`;
- render the matching `#save-button` state and label;
- publish `tnx:sheet-save-state` when the state changes;
- expose `TNXSheetSaveState` plus module helpers for consumers that need to query dirty state, request a save, wait for completion, or focus the save button.

Consumers must not parse `#save-status` text/classes or duplicate the save-button presentation mapping.

Current consumers:

- `sheet-snapshots.js` uses the shared bridge for its unsaved guard and save-button focus.
- `sheet-image.js` uses `requestSheetSave()` + `waitForSheetSaved()` while bootstrapping the first save before image upload.
- `sheet-save-diagnostics.js` listens to `tnx:sheet-save-state`; it no longer owns a second `MutationObserver` over `#save-status`.
- `sheet-features.js` no longer owns a second MutationObserver for save presentation.

The former `sheet-save-watchdog.js` has been removed from the repository. Its historic autosave timer interception, timer monkey-patching, duplicate unsaved-state parser, and duplicate `beforeunload` listener are retired.

Current ownership boundary:

- `sheet-save-coordinator.js`: save lifecycle state and status production;
- `sheet.js`: canonical editor payload collection and transactional persistence callback;
- `sheet-save-state.js`: presentation and consumer API;
- `sheet-save-diagnostics.js`: diagnostic interpretation only.

The next extraction target, if needed, is the persistence callback itself. That should move only after the coordinator boundary has remained green, because the callback carries the transactional character/skill/outfit bundle contract and the `tnx:character-saved` integration event.

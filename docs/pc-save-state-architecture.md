# PC editor save-state ownership

The classic PC editor now separates persistence, save orchestration, and save-state presentation.

`js/sheet-save-coordinator.js` owns producer-side save lifecycle mechanics:

- dirty / saving / pending state;
- queued repeat-save handling while a save is already running;
- validation gating;
- loading, saved, unsaved, and error transitions;
- publishing those transitions through `setSheetSaveState()`.

It does not read or write `#save-status` directly.

`js/sheet.js` owns editor data collection and the transactional persistence boundary. It supplies the coordinator with a `persist()` callback that calls `save_character_bundle`, updates the current character/public ID, rewrites the editor URL, and publishes `tnx:character-saved`.

`js/sheet-save-state.js` is the single save-state store and presentation/consumer boundary.

Responsibilities:

- keep the explicit current state (`unsaved`, `saving`, `saved`, or `error`) and current status text;
- render `#save-status` and the matching `#save-button` state/label from that explicit state;
- publish `tnx:sheet-save-state` when the producer changes state;
- expose `TNXSheetSaveState` plus module helpers for consumers that need to query dirty state, request a save, wait for completion, or focus the save button.

The store no longer infers state by parsing `#save-status` text/classes and no longer uses a `MutationObserver` over the status DOM. DOM is presentation output, not the source of truth.

Current consumers use the shared `?v=2` cache boundary:

- `sheet-snapshots.js` uses the shared store for its unsaved guard and save-button focus.
- `sheet-image.js` uses `requestSheetSave()` + `waitForSheetSaved()` while bootstrapping the first save before image upload.
- `sheet-save-diagnostics.js` listens to `tnx:sheet-save-state`; it does not observe `#save-status`.
- `sheet-features.js` imports the shared store only to guarantee the common presentation boundary is installed.

The former `sheet-save-watchdog.js` has been removed from the repository. Its historic autosave timer interception, timer monkey-patching, duplicate unsaved-state parser, and duplicate `beforeunload` listener are retired.

Current ownership boundary:

- `sheet-save-coordinator.js`: save lifecycle mechanics and explicit state publication;
- `sheet.js`: canonical editor payload collection and transactional persistence callback;
- `sheet-save-state.js`: state store, status/button presentation, and consumer API;
- `sheet-save-diagnostics.js`: diagnostic interpretation only.

The next extraction target, if needed, is the persistence callback itself. That should move only after this explicit state-store boundary has remained green, because the callback carries the transactional character/skill/outfit bundle contract and the `tnx:character-saved` integration event.

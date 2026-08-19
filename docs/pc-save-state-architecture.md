# PC editor save-state ownership

`js/sheet.js` remains the persistence owner for the classic PC editor. It decides when the sheet is dirty, performs the transactional save RPC, and writes the source `#save-status` text/class.

`js/sheet-save-state.js` is the single presentation/consumer bridge for save state.

Responsibilities:

- interpret `#save-status` as `unsaved`, `saving`, `saved`, or `error`;
- render the matching `#save-button` state and label;
- publish `tnx:sheet-save-state` when the state changes;
- expose `TNXSheetSaveState` plus module helpers for consumers that need to query dirty state, request a save, wait for completion, or focus the save button.

Consumers must not parse `#save-status` text/classes or duplicate the save-button presentation mapping. `sheet-snapshots.js` now uses the shared bridge for its unsaved guard. `sheet-features.js` no longer owns a second MutationObserver for save presentation.

The next migration target is `sheet-image.js`, which still contains direct save-button/status polling while it bootstraps a first save before image upload. That flow should move to `requestSheetSave()` + `waitForSheetSaved()` after the shared bridge is green in Regression/E2E.

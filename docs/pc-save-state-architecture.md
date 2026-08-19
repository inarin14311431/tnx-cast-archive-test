# PC editor save-state ownership

`js/sheet.js` remains the persistence owner for the classic PC editor. It decides when the sheet is dirty, performs the transactional save RPC, and writes the source `#save-status` text/class.

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
- `sheet-save-watchdog.js` is now manual-save wording compatibility only. The historic 1.2-second autosave timer interception, timer monkey-patching, duplicate unsaved-state parser, and duplicate `beforeunload` listener have been retired.

The remaining ownership seam is the producer side in `sheet.js`: `setStatus()`, save-button click binding, `dirty/saving/pending`, and the transactional `saveAll()` flow still live together there. Future extraction should preserve that transactional behavior and move producer mechanics behind an explicit coordinator API rather than adding another observer or polling layer.
